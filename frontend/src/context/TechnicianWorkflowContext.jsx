// frontend/src/context/TechnicianWorkflowContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from './AuthContext'

const TechnicianWorkflowContext = createContext(null)
const DEVELOPMENT_TECHNICIAN_ID = 1
const REPORT_REQUIRED_RESPONSE_MESSAGE = 'A service report must be submitted BEFORE completing this job. Submit the report first, then mark it completed.'
export const REPORT_REQUIRED_MESSAGE = 'Please submit the service report before completing this job. Use Open Report Form to continue.'

const JOB_STATUS = Object.freeze({
  UPCOMING: 'Upcoming',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
})

const normalizeStatus = (status) =>
  String(status || '').trim().replace(/\s+/g, ' ').toLowerCase()

const TRANSITION_RULES = Object.freeze({
  start: {
    allowedStatuses: new Set(['upcoming', 'assigned', 'pending']),
    nextStatus: JOB_STATUS.IN_PROGRESS,
  },
  complete: {
    allowedStatuses: new Set(['in progress']),
    nextStatus: JOB_STATUS.COMPLETED,
  },
})

function createTransitionError(message, code) {
  const error = new Error(message)
  error.name = 'TechnicianTransitionError'
  if (code) error.code = code
  return error
}

function TechnicianWorkflowProvider({ children }) {
  const { user, token, initializing } = useAuth()
  const { technicianID, identitySource, canMutateTechnicianData } = useMemo(() => {
    if (initializing) {
      return { technicianID: null, identitySource: 'initializing', canMutateTechnicianData: false }
    }

    // An incomplete or non-Technician session must never silently impersonate the dev account.
    if (user || token) {
      const role = String(user?.role || user?.accountType || '').toLowerCase()
      const id = Number(user?.technician_ID)
      if (token && role === 'technician' && Number.isSafeInteger(id) && id > 0) {
        return { technicianID: id, identitySource: 'authenticated', canMutateTechnicianData: true }
      }
      return { technicianID: null, identitySource: 'unavailable', canMutateTechnicianData: false }
    }

    if (import.meta.env.DEV) {
      return { technicianID: DEVELOPMENT_TECHNICIAN_ID, identitySource: 'development', canMutateTechnicianData: false }
    }
    return { technicianID: null, identitySource: 'unavailable', canMutateTechnicianData: false }
  }, [initializing, user, token])
  // Reference identity separates session generations, including token changes and A → B → A.
  const identityKey = useMemo(() => ({ technicianID, identitySource, token }), [technicianID, identitySource, token])
  const activeIdentityKeyRef = useRef(identityKey)
  activeIdentityKeyRef.current = identityKey
  const mountedRef = useRef(true)
  const confirmedRevisionRef = useRef(0)
  const jobsRequestGenerationRef = useRef(0)
  const activeJobsRequestRef = useRef(null)
  const [jobsState, setJobsState] = useState({
    identityKey: null, jobs: [], loading: true, error: null, dataAvailable: false,
  })
  const [jobStatusOverrides, setJobStatusOverrides] = useState({ identityKey: null, values: {} })
  const [pendingTransitionState, setPendingTransitionState] = useState({ identityKey: null, jobIDs: [] })
  const pendingTransitionJobIDsRef = useRef({ identityKey, jobIDs: new Set() })
  if (pendingTransitionJobIDsRef.current.identityKey !== identityKey) {
    pendingTransitionJobIDsRef.current = { identityKey, jobIDs: new Set() }
  }

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const activeJobsState = jobsState.identityKey === identityKey
    ? jobsState
    : { jobs: [], loading: true, error: null, dataAvailable: false }
  const { jobs: dbJobs, loading, error, dataAvailable } = activeJobsState
  const activeOverrides = jobStatusOverrides.identityKey === identityKey
    ? jobStatusOverrides.values
    : {}

  const fetchJobs = useCallback(async () => {
    if (!mountedRef.current || activeIdentityKeyRef.current !== identityKey) return
    activeJobsRequestRef.current?.controller.abort()
    const controller = new AbortController()
    const request = {
      identityKey, controller, generation: ++jobsRequestGenerationRef.current,
      startedRevision: confirmedRevisionRef.current,
    }
    activeJobsRequestRef.current = request
    const isCurrent = () => mountedRef.current && !controller.signal.aborted
      && activeJobsRequestRef.current === request
      && jobsRequestGenerationRef.current === request.generation
      && activeIdentityKeyRef.current === identityKey

    const updateJobs = (nextState) => setJobsState((current) => isCurrent() ? nextState : current)
    updateJobs({ identityKey, jobs: [], loading: true, error: null, dataAvailable: false })

    if (initializing) return

    if (!technicianID) {
      updateJobs({
        identityKey, jobs: [], loading: false,
        error: 'Technician identity is unavailable.', dataAvailable: false,
      })
      return
    }

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`http://localhost:5000/api/technician/jobs?techId=${technicianID}`, {
        headers, signal: controller.signal,
      })
      const data = await res.json()
      if (!isCurrent()) return

      // The documented normal envelope includes technicianName. The current
      // DB-unavailable early return omits it; HTTP 200 alone is not sufficient.
      const returnedJobIDs = new Set()
      const validResponse = res.ok && data?.success === true
        && typeof data.technicianName === 'string' && Boolean(data.technicianName.trim())
        && Array.isArray(data.jobs) && data.jobs.every((job) => {
          if (!job || !Number.isSafeInteger(job.job_ID) || job.job_ID <= 0
            || typeof job.status !== 'string' || !job.status.trim() || returnedJobIDs.has(job.job_ID)) return false
          returnedJobIDs.add(job.job_ID)
          return true
        })
      if (!validResponse) {
        updateJobs({ identityKey, jobs: [], loading: false, error: 'Assigned job data is unavailable.', dataAvailable: false })
        return
      }
      const pendingAtResponse = new Set(pendingTransitionJobIDsRef.current.jobIDs)
      updateJobs({ identityKey, jobs: data.jobs, loading: false, error: null, dataAvailable: true })
      setJobStatusOverrides((current) => {
        if (!isCurrent()) return current
        if (current.identityKey !== identityKey) return { identityKey, values: {} }
        const values = { ...current.values }
        // Only a read started after confirmation can supersede that override.
        // Omitted bookings and writes pending at response/commit stay protected.
        for (const [jobID, override] of Object.entries(values)) {
          if (override.confirmedRevision <= request.startedRevision && returnedJobIDs.has(Number(jobID))
            && !pendingAtResponse.has(Number(jobID))
            && !pendingTransitionJobIDsRef.current.jobIDs.has(Number(jobID))) delete values[jobID]
        }
        return { identityKey, values }
      })
    } catch (err) {
      if (!isCurrent()) return
      console.error('[Technician Context] Error fetching live jobs:', err)
      updateJobs({ identityKey, jobs: [], loading: false, error: 'Assigned job data is unavailable.', dataAvailable: false })
    }
  }, [identityKey, initializing, technicianID, token])

  useEffect(() => {
    fetchJobs()
    return () => {
      if (activeJobsRequestRef.current?.identityKey === identityKey) {
        activeJobsRequestRef.current.controller.abort()
      }
    }
  }, [fetchJobs, identityKey])

  const baselineJobById = useMemo(
    () => new Map(dbJobs.map((job) => [job.job_ID, job])),
    [dbJobs],
  )

  const transitionJobStatus = useCallback(
    async (jobID, transitionName) => {
      if (!mountedRef.current || !canMutateTechnicianData || activeIdentityKeyRef.current !== identityKey) {
        throw createTransitionError('Status updates require an authenticated Technician session.')
      }
      const transition = TRANSITION_RULES[transitionName]
      const baselineJob = baselineJobById.get(jobID)

      if (!dataAvailable || !baselineJob) {
        throw createTransitionError('This booking is not available for a status update.')
      }

      const effectiveStatus = activeOverrides[jobID]?.status ?? baselineJob.status
      if (!transition || !transition.allowedStatuses.has(normalizeStatus(effectiveStatus))) {
        throw createTransitionError('This booking cannot be updated from its current status.')
      }

      const pendingSession = pendingTransitionJobIDsRef.current
      const isCurrentSession = () => mountedRef.current && activeIdentityKeyRef.current === identityKey
        && pendingTransitionJobIDsRef.current === pendingSession
      if (pendingSession.jobIDs.has(jobID)) {
        throw createTransitionError('A status update for this booking is already in progress.')
      }

      const updatePending = () => setPendingTransitionState((current) => isCurrentSession()
        ? { identityKey, jobIDs: Array.from(pendingSession.jobIDs) } : current)
      pendingSession.jobIDs.add(jobID)
      updatePending()

      try {
        const headers = { 'Content-Type': 'application/json' }
        if (token) headers.Authorization = `Bearer ${token}`

        const response = await fetch(
          `http://localhost:5000/api/technician/jobs/${jobID}/status`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({ status: transition.nextStatus }),
          },
        )

        let result = null
        try {
          result = await response.json()
        } catch (parseError) {
          if (isCurrentSession()) {
            console.error(
              `[Technician Context] Invalid status response for booking #${jobID}:`,
              parseError,
            )
          }
        }

        if (!response.ok || result?.success !== true) {
          if (transitionName === 'complete' && response.status === 400 && result?.success === false
            && result?.message === REPORT_REQUIRED_RESPONSE_MESSAGE) {
            throw createTransitionError(REPORT_REQUIRED_MESSAGE, 'REPORT_REQUIRED')
          }
          throw new Error(
            `Status request failed with HTTP ${response.status} and success=${String(result?.success)}`,
          )
        }

        if (!isCurrentSession()) {
          throw createTransitionError('The Technician session changed during the status update.')
        }
        const confirmedRevision = ++confirmedRevisionRef.current
        setJobStatusOverrides((currentOverrides) => {
          if (!isCurrentSession()) return currentOverrides
          const values = currentOverrides.identityKey === identityKey ? currentOverrides.values : {}
          if (values[jobID]?.confirmedRevision > confirmedRevision) return currentOverrides
          return { identityKey, values: {
            ...values, [jobID]: { status: transition.nextStatus, confirmedRevision },
          } }
        })

        return {
          success: true,
          jobID,
          status: transition.nextStatus,
        }
      } catch (err) {
        if (isCurrentSession() && transitionName === 'complete'
          && err?.name === 'TechnicianTransitionError' && err.code === 'REPORT_REQUIRED') {
          throw err
        }
        if (isCurrentSession()) {
          console.error(
            `[Technician Context] Failed to persist status update for booking #${jobID}:`,
            err,
          )
        }
        throw createTransitionError('The booking status could not be updated. Please try again.')
      } finally {
        if (isCurrentSession()) {
          pendingSession.jobIDs.delete(jobID)
          updatePending()
        }
      }
    },
    [activeOverrides, baselineJobById, canMutateTechnicianData, dataAvailable, identityKey, token],
  )

  const startService = useCallback(
    (jobID) => transitionJobStatus(jobID, 'start'),
    [transitionJobStatus],
  )

  const completeService = useCallback(
    (jobID) => transitionJobStatus(jobID, 'complete'),
    [transitionJobStatus],
  )

  const isTransitionPending = useCallback(
    (jobID) => pendingTransitionState.identityKey === identityKey
      && pendingTransitionState.jobIDs.includes(jobID),
    [identityKey, pendingTransitionState],
  )

  const assignedJobs = useMemo(
    () =>
      dbJobs.map((job) => ({
        ...job,
        status: activeOverrides[job.job_ID]?.status ?? job.status,
      })),
    [activeOverrides, dbJobs],
  )

  const reportableJobs = useMemo(
    () => assignedJobs.filter((job) => job.status === JOB_STATUS.COMPLETED),
    [assignedJobs],
  )

  const workload = useMemo(() => {
    const byStatus = {
      upcoming: 0,
      inProgress: 0,
      completed: 0,
    }

    assignedJobs.forEach((job) => {
      if (job.status === JOB_STATUS.UPCOMING || job.status === 'Assigned' || job.status === 'Pending') {
        byStatus.upcoming += 1
      }
      if (job.status === JOB_STATUS.IN_PROGRESS) byStatus.inProgress += 1
      if (job.status === JOB_STATUS.COMPLETED) byStatus.completed += 1
    })

    return {
      assignedJobs: assignedJobs.length,
      byStatus,
    }
  }, [assignedJobs])

  const value = useMemo(
    () => ({
      technicianID,
      identitySource,
      isDevelopmentFallback: identitySource === 'development',
      canMutateTechnicianData,
      assignedJobs,
      reportableJobs,
      workload,
      loading,
      error,
      dataAvailable,
      refreshJobs: fetchJobs,
      startService,
      completeService,
      isTransitionPending,
    }),
    [technicianID, identitySource, canMutateTechnicianData, assignedJobs, reportableJobs, workload, loading, error, dataAvailable, fetchJobs, startService, completeService, isTransitionPending],
  )

  return (
    <TechnicianWorkflowContext.Provider value={value}>
      {children}
    </TechnicianWorkflowContext.Provider>
  )
}

function useTechnicianWorkflow() {
  const context = useContext(TechnicianWorkflowContext)

  if (!context) {
    throw new Error(
      'useTechnicianWorkflow must be used within TechnicianWorkflowProvider',
    )
  }

  return context
}

export { TechnicianWorkflowProvider, useTechnicianWorkflow }
