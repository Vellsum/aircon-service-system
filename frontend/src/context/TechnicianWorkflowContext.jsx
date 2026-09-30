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
  const { user, token } = useAuth()
  const [dbJobs, setDbJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dataAvailable, setDataAvailable] = useState(false)
  const [jobStatusOverrides, setJobStatusOverrides] = useState({})
  const [pendingTransitionJobIDs, setPendingTransitionJobIDs] = useState([])
  const pendingTransitionJobIDsRef = useRef(new Set())

  const technicianID = user?.technician_ID ?? null

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDataAvailable(false)

    if (!technicianID) {
      setDbJobs([])
      setJobStatusOverrides({})
      setError('Technician identity is unavailable.')
      setLoading(false)
      return
    }

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`http://localhost:5000/api/technician/jobs?techId=${technicianID}`, { headers })
      const data = await res.json()

      if (res.ok && data.success && Array.isArray(data.jobs)) {
        setDbJobs(data.jobs)
        setDataAvailable(true)
      } else {
        setDbJobs([])
        setError('Assigned job data is unavailable.')
      }
    } catch (err) {
      console.error('[Technician Context] Error fetching live jobs:', err)
      setDbJobs([])
      setError('Assigned job data is unavailable.')
    } finally {
      setLoading(false)
    }
  }, [technicianID, token])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const baselineJobById = useMemo(
    () => new Map(dbJobs.map((job) => [job.job_ID, job])),
    [dbJobs],
  )

  const transitionJobStatus = useCallback(
    async (jobID, transitionName) => {
      const transition = TRANSITION_RULES[transitionName]
      const baselineJob = baselineJobById.get(jobID)

      if (!dataAvailable || !baselineJob) {
        throw createTransitionError('This booking is not available for a status update.')
      }

      const effectiveStatus = jobStatusOverrides[jobID] ?? baselineJob.status
      if (!transition || !transition.allowedStatuses.has(normalizeStatus(effectiveStatus))) {
        throw createTransitionError('This booking cannot be updated from its current status.')
      }

      if (pendingTransitionJobIDsRef.current.has(jobID)) {
        throw createTransitionError('A status update for this booking is already in progress.')
      }

      pendingTransitionJobIDsRef.current.add(jobID)
      setPendingTransitionJobIDs(Array.from(pendingTransitionJobIDsRef.current))

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

        setJobStatusOverrides((currentOverrides) => ({
          ...currentOverrides,
          [jobID]: transition.nextStatus,
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
        pendingTransitionJobIDsRef.current.delete(jobID)
        setPendingTransitionJobIDs(Array.from(pendingTransitionJobIDsRef.current))
      }
    },
    [baselineJobById, dataAvailable, jobStatusOverrides, token],
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
    (jobID) => pendingTransitionJobIDs.includes(jobID),
    [pendingTransitionJobIDs],
  )

  const assignedJobs = useMemo(
    () =>
      dbJobs.map((job) => ({
        ...job,
        status: jobStatusOverrides[job.job_ID] ?? job.status,
      })),
    [dbJobs, jobStatusOverrides],
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
    [assignedJobs, reportableJobs, workload, loading, error, dataAvailable, fetchJobs, startService, completeService, isTransitionPending],
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
