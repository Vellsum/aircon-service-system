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

function createTransitionError(message) {
  const error = new Error(message)
  error.name = 'TechnicianTransitionError'
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
  const identityKey = `${identitySource}:${technicianID ?? 'none'}`
  const activeIdentityKeyRef = useRef(identityKey)
  activeIdentityKeyRef.current = identityKey
  const activeJobsRequestRef = useRef(null)
  const [jobsState, setJobsState] = useState({
    identityKey: null, jobs: [], loading: true, error: null, dataAvailable: false,
  })
  const [jobStatusOverrides, setJobStatusOverrides] = useState({ identityKey: null, values: {} })
  const [pendingTransitionState, setPendingTransitionState] = useState({ identityKey: null, jobIDs: [] })
  const pendingTransitionJobIDsRef = useRef(new Set())

  const activeJobsState = jobsState.identityKey === identityKey
    ? jobsState
    : { jobs: [], loading: true, error: null, dataAvailable: false }
  const { jobs: dbJobs, loading, error, dataAvailable } = activeJobsState
  const activeOverrides = jobStatusOverrides.identityKey === identityKey
    ? jobStatusOverrides.values
    : {}

  const fetchJobs = useCallback(async () => {
    activeJobsRequestRef.current?.abort()
    const controller = new AbortController()
    activeJobsRequestRef.current = controller
    const isCurrent = () => !controller.signal.aborted
      && activeJobsRequestRef.current === controller
      && activeIdentityKeyRef.current === identityKey

    setJobsState({ identityKey, jobs: [], loading: true, error: null, dataAvailable: false })

    if (initializing) return

    if (!technicianID) {
      setJobsState({
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

      if (res.ok && data.success && Array.isArray(data.jobs)) {
        setJobsState({ identityKey, jobs: data.jobs, loading: false, error: null, dataAvailable: true })
      } else {
        setJobsState({ identityKey, jobs: [], loading: false, error: 'Assigned job data is unavailable.', dataAvailable: false })
      }
    } catch (err) {
      if (!isCurrent()) return
      console.error('[Technician Context] Error fetching live jobs:', err)
      setJobsState({ identityKey, jobs: [], loading: false, error: 'Assigned job data is unavailable.', dataAvailable: false })
    }
  }, [identityKey, initializing, technicianID, token])

  useEffect(() => {
    fetchJobs()
    return () => activeJobsRequestRef.current?.abort()
  }, [fetchJobs])

  useEffect(() => {
    setJobStatusOverrides({ identityKey, values: {} })
    pendingTransitionJobIDsRef.current.clear()
    setPendingTransitionState({ identityKey, jobIDs: [] })
  }, [identityKey])

  const baselineJobById = useMemo(
    () => new Map(dbJobs.map((job) => [job.job_ID, job])),
    [dbJobs],
  )

  const transitionJobStatus = useCallback(
    async (jobID, transitionName) => {
      if (!canMutateTechnicianData || activeIdentityKeyRef.current !== identityKey) {
        throw createTransitionError('Status updates require an authenticated Technician session.')
      }
      const transition = TRANSITION_RULES[transitionName]
      const baselineJob = baselineJobById.get(jobID)

      if (!dataAvailable || !baselineJob) {
        throw createTransitionError('This booking is not available for a status update.')
      }

      const effectiveStatus = activeOverrides[jobID] ?? baselineJob.status
      if (!transition || !transition.allowedStatuses.has(normalizeStatus(effectiveStatus))) {
        throw createTransitionError('This booking cannot be updated from its current status.')
      }

      if (pendingTransitionJobIDsRef.current.has(jobID)) {
        throw createTransitionError('A status update for this booking is already in progress.')
      }

      pendingTransitionJobIDsRef.current.add(jobID)
      setPendingTransitionState({ identityKey, jobIDs: Array.from(pendingTransitionJobIDsRef.current) })

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
          console.error(
            `[Technician Context] Invalid status response for booking #${jobID}:`,
            parseError,
          )
        }

        if (!response.ok || result?.success !== true) {
          throw new Error(
            `Status request failed with HTTP ${response.status} and success=${String(result?.success)}`,
          )
        }

        if (activeIdentityKeyRef.current !== identityKey) {
          throw createTransitionError('The Technician session changed during the status update.')
        }
        setJobStatusOverrides((currentOverrides) => ({
          identityKey,
          values: {
            ...(currentOverrides.identityKey === identityKey ? currentOverrides.values : {}),
            [jobID]: transition.nextStatus,
          },
        }))

        return {
          success: true,
          jobID,
          status: transition.nextStatus,
        }
      } catch (err) {
        console.error(
          `[Technician Context] Failed to persist status update for booking #${jobID}:`,
          err,
        )
        throw createTransitionError('The booking status could not be updated. Please try again.')
      } finally {
        if (activeIdentityKeyRef.current === identityKey) {
          pendingTransitionJobIDsRef.current.delete(jobID)
          setPendingTransitionState({ identityKey, jobIDs: Array.from(pendingTransitionJobIDsRef.current) })
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
        status: activeOverrides[job.job_ID] ?? job.status,
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
