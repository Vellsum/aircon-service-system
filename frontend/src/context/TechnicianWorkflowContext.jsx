// frontend/src/context/TechnicianWorkflowContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const TechnicianWorkflowContext = createContext(null)

const JOB_STATUS = Object.freeze({
  UPCOMING: 'Upcoming',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
})

function TechnicianWorkflowProvider({ children }) {
  const [dbJobs, setDbJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [jobStatusOverrides, setJobStatusOverrides] = useState({})

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token') || ''
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const currentTechId = storedUser.technician_ID || storedUser.id || storedUser.user_ID || 1
      const res = await fetch(`http://localhost:5000/api/technician/jobs?techId=${currentTechId}`, { headers })
      const data = await res.json()

      if (res.ok && data.success && Array.isArray(data.jobs)) {
        setDbJobs(data.jobs)
      }
    } catch (err) {
      console.error('[Technician Context] Error fetching live jobs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const baselineJobById = useMemo(
    () => new Map(dbJobs.map((job) => [job.job_ID, job])),
    [dbJobs],
  )

  const transitionJobStatus = useCallback(
    async (jobID, expectedStatus, nextStatus) => {
      setJobStatusOverrides((currentOverrides) => {
        const baselineJob = baselineJobById.get(jobID) || {}
        const effectiveStatus = currentOverrides[jobID] ?? baselineJob.status ?? expectedStatus

        if (effectiveStatus !== expectedStatus && effectiveStatus !== 'Assigned' && effectiveStatus !== 'Pending') {
          return currentOverrides
        }

        return {
          ...currentOverrides,
          [jobID]: nextStatus,
        }
      })

      try {
        const token = localStorage.getItem('token') || ''
        await fetch(`http://localhost:5000/api/technician/jobs/${jobID}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        })
      } catch (err) {
        console.error(`[Technician Context] Failed to persist status update for job #${jobID}:`, err)
      }
    },
    [baselineJobById],
  )

  const startService = useCallback(
    (jobID) =>
      transitionJobStatus(jobID, JOB_STATUS.UPCOMING, JOB_STATUS.IN_PROGRESS),
    [transitionJobStatus],
  )

  const completeService = useCallback(
    (jobID) =>
      transitionJobStatus(jobID, JOB_STATUS.IN_PROGRESS, JOB_STATUS.COMPLETED),
    [transitionJobStatus],
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
      refreshJobs: fetchJobs,
      startService,
      completeService,
    }),
    [assignedJobs, reportableJobs, workload, loading, fetchJobs, startService, completeService],
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