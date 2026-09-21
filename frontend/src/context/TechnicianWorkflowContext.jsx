import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { selectCurrentTechnicianJobViewModels } from '../pages/technician/data/technicianSelectors'

const TechnicianWorkflowContext = createContext(null)

const JOB_STATUS = Object.freeze({
  UPCOMING: 'Upcoming',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
})

function TechnicianWorkflowProvider({ children }) {
  const baselineJobs = useMemo(() => selectCurrentTechnicianJobViewModels(), [])
  const baselineJobById = useMemo(
    () => new Map(baselineJobs.map((job) => [job.job_ID, job])),
    [baselineJobs],
  )
  const [jobStatusOverrides, setJobStatusOverrides] = useState({})

  const transitionJobStatus = useCallback(
    (jobID, expectedStatus, nextStatus) => {
      setJobStatusOverrides((currentOverrides) => {
        const baselineJob = baselineJobById.get(jobID)

        if (!baselineJob) return currentOverrides

        const effectiveStatus = currentOverrides[jobID] ?? baselineJob.status

        if (effectiveStatus !== expectedStatus) return currentOverrides

        return {
          ...currentOverrides,
          [jobID]: nextStatus,
        }
      })
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
      baselineJobs.map((job) => ({
        ...job,
        status: jobStatusOverrides[job.job_ID] ?? job.status,
      })),
    [baselineJobs, jobStatusOverrides],
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
      if (job.status === JOB_STATUS.UPCOMING) byStatus.upcoming += 1
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
      startService,
      completeService,
    }),
    [assignedJobs, reportableJobs, workload, startService, completeService],
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
