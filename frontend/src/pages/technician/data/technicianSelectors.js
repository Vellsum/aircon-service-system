import {
  CURRENT_TECHNICIAN_ENTITY_ID,
  CURRENT_TECHNICIAN_USER_ID,
  TECHNICIAN_MOCK_ENTITY_STATE,
} from './technicianMockEntities'
import { selectTechnicianFollowUpDemoViewModels } from './technicianFollowUpDemo'
import { selectTechnicianPartsLogDemoViewModels } from './technicianPartsLogDemo'

function indexBy(records, key) {
  return new Map(records.map((record) => [record[key], record]))
}

function getCollection(entityState, key) {
  return Array.isArray(entityState?.[key]) ? entityState[key] : []
}

function getPresentationCollection(entityState, key) {
  return Array.isArray(entityState?.presentation?.[key])
    ? entityState.presentation[key]
    : []
}

function createEntityIndexes(entityState) {
  return {
    bookingById: indexBy(getCollection(entityState, 'bookings'), 'booking_ID'),
    bookingPresentationById: indexBy(
      getPresentationCollection(entityState, 'bookings'),
      'booking_ID',
    ),
    customerPresentationById: indexBy(
      getPresentationCollection(entityState, 'customers'),
      'customer_ID',
    ),
    jobById: indexBy(getCollection(entityState, 'jobs'), 'job_ID'),
    jobPresentationById: indexBy(
      getPresentationCollection(entityState, 'jobs'),
      'job_ID',
    ),
    technicianByUserId: indexBy(getCollection(entityState, 'technicians'), 'user_ID'),
    technicianPresentationById: indexBy(
      getPresentationCollection(entityState, 'technicians'),
      'technician_ID',
    ),
    userById: indexBy(getCollection(entityState, 'users'), 'user_ID'),
  }
}

export function selectTechnicianContext(entityState, user_ID) {
  const { technicianByUserId, technicianPresentationById, userById } =
    createEntityIndexes(entityState)
  const user = userById.get(user_ID)
  const technician = technicianByUserId.get(user_ID)

  if (!user || user.isDeleted || user.accountType !== 'Technician' || !technician) {
    return null
  }

  const presentation = technicianPresentationById.get(technician.technician_ID)

  return {
    user_ID: user.user_ID,
    username: user.username,
    accountType: user.accountType,
    isDeleted: user.isDeleted,
    technician_ID: technician.technician_ID,
    technicianName: technician.technician_name,
    technicianRating: technician.technician_rating,
    firstName: presentation?.firstName || technician.technician_name.split(' ')[0],
    roleLabel: presentation?.roleLabel || 'Technician',
    averageRating: presentation?.averageRating ?? null,
  }
}

function createProfileInitials(name) {
  const nameParts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (nameParts.length === 0) return '—'

  return [nameParts[0], nameParts[nameParts.length - 1]]
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function selectTechnicianProfile(entityState, user_ID) {
  const technicianContext = selectTechnicianContext(entityState, user_ID)

  if (!technicianContext) return null

  const assignedJobIDs = new Set(
    selectAssignedJobs(entityState, technicianContext.technician_ID).map(
      (job) => job.job_ID,
    ),
  )
  const completedJobIDs = new Set(
    selectTechnicianJobHistory(entityState, technicianContext.technician_ID).map(
      (job) => job.job_ID,
    ),
  )

  return {
    userID: technicianContext.user_ID,
    technicianID: technicianContext.technician_ID,
    technicianName: technicianContext.technicianName,
    initials: createProfileInitials(technicianContext.technicianName),
    username: technicianContext.username,
    accountType: technicianContext.accountType,
    accountStatus: technicianContext.isDeleted ? 'Inactive' : 'Active',
    technicianRating: technicianContext.technicianRating,
    workSummary: {
      assignedJobs: assignedJobIDs.size,
      completedJobs: completedJobIDs.size,
    },
    presentation: {
      roleLabel: technicianContext.roleLabel,
    },
    availability: {
      rating: Number.isFinite(technicianContext.technicianRating),
      phone: false,
      email: false,
      specialty: false,
      avatar: false,
      editing: false,
      passwordChange: false,
    },
  }
}

function createJobViewModel(workRelationship, indexes) {
  const {
    bookingById,
    bookingPresentationById,
    customerPresentationById,
    jobById,
    jobPresentationById,
  } = indexes
  const booking = bookingById.get(workRelationship.booking_ID)
  const job = jobById.get(workRelationship.job_ID)

  if (!booking || !job) return null

  const bookingPresentation = bookingPresentationById.get(booking.booking_ID)
  const customerPresentation = customerPresentationById.get(booking.customer_ID)
  const jobPresentation = jobPresentationById.get(job.job_ID)

  if (!bookingPresentation || !customerPresentation || !jobPresentation) return null

  return {
    id: jobPresentation.displayJobCode,
    customerName: customerPresentation.customerName,
    customerPhone: customerPresentation.customerPhone,
    customerEmail: customerPresentation.customerEmail,
    serviceType: jobPresentation.serviceType,
    serviceCategory: jobPresentation.serviceCategory,
    date: booking.date,
    formattedDate: bookingPresentation.formattedDate,
    time: booking.time,
    estimatedDuration: jobPresentation.estimatedDuration,
    status: job.job_status,
    timeframe: jobPresentation.timeframe,
    address: booking.location,
    postalCode: bookingPresentation.postalCode,
    unitType: jobPresentation.unitType,
    notes: jobPresentation.notes,
    priority: jobPresentation.priority,
    job_ID: job.job_ID,
    booking_ID: booking.booking_ID,
    technician_ID: booking.technician_ID,
    customer_ID: booking.customer_ID,
    serviceID: job.serviceID,
  }
}

export function selectAssignedJobs(entityState, technician_ID) {
  const bookings = getCollection(entityState, 'bookings')
  const workRelationships = getCollection(entityState, 'work')
  const indexes = createEntityIndexes(entityState)
  const assignedBookingIds = new Set(
    bookings.filter((booking) => booking.technician_ID === technician_ID).map(
      (booking) => booking.booking_ID,
    ),
  )

  return workRelationships
    .filter((relationship) => assignedBookingIds.has(relationship.booking_ID))
    .map((relationship) => createJobViewModel(relationship, indexes))
    .filter(Boolean)
}

export function selectReportableJobs(entityState, technician_ID) {
  const jobById = indexBy(getCollection(entityState, 'jobs'), 'job_ID')

  return selectAssignedJobs(entityState, technician_ID).filter((jobViewModel) => {
    const job = jobById.get(jobViewModel.job_ID)

    return job?.job_status === 'Completed'
  })
}

export function selectTechnicianJobHistory(entityState, technician_ID) {
  const historyRelationships = getCollection(entityState, 'jobHistory')
  const workRelationships = getCollection(entityState, 'work')
  const indexes = createEntityIndexes(entityState)
  const workByJobId = indexBy(workRelationships, 'job_ID')

  return historyRelationships
    .filter((historyRecord) => historyRecord.technician_ID === technician_ID)
    .map((historyRecord) => {
      const job = indexes.jobById.get(historyRecord.job_ID)
      const workRelationship = job ? workByJobId.get(job.job_ID) : null

      return workRelationship ? createJobViewModel(workRelationship, indexes) : null
    })
    .filter(Boolean)
}

function createMonthLabel(period) {
  const [year, month] = period.split('-').map(Number)

  if (!year || !month) return period

  return new Intl.DateTimeFormat('en-SG', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))
}

export function selectTechnicianPerformance(entityState, technician_ID) {
  const technician = getCollection(entityState, 'technicians').find(
    (record) => record.technician_ID === technician_ID,
  )

  if (!technician) return null

  const assignedJobs = selectAssignedJobs(entityState, technician_ID)
  const completedHistoryJobs = Array.from(
    new Map(
      selectTechnicianJobHistory(entityState, technician_ID).map((job) => [
        job.job_ID,
        job,
      ]),
    ).values(),
  )
  const byStatus = {
    upcoming: 0,
    inProgress: 0,
    completed: 0,
  }
  const completedByMonth = new Map()
  const completedByService = new Map()

  assignedJobs.forEach((job) => {
    const normalizedStatus = job.status?.trim().toLowerCase()

    if (normalizedStatus === 'upcoming') byStatus.upcoming += 1
    if (normalizedStatus === 'in progress') byStatus.inProgress += 1
    if (normalizedStatus === 'completed') byStatus.completed += 1
  })

  completedHistoryJobs.forEach((job) => {
    const period = job.date?.slice(0, 7)

    if (/^\d{4}-\d{2}$/.test(period)) {
      completedByMonth.set(period, (completedByMonth.get(period) || 0) + 1)
    }

    if (job.serviceType) {
      completedByService.set(
        job.serviceType,
        (completedByService.get(job.serviceType) || 0) + 1,
      )
    }
  })

  return {
    technicianID: technician.technician_ID,
    technicianName: technician.technician_name,
    technicianRating: technician.technician_rating,
    workload: {
      assignedJobs: assignedJobs.length,
      byStatus,
    },
    completedWork: {
      total: completedHistoryJobs.length,
      byMonth: Array.from(completedByMonth, ([period, count]) => ({
        period,
        label: createMonthLabel(period),
        count,
      })).sort((first, second) => second.period.localeCompare(first.period)),
      byService: Array.from(completedByService, ([serviceName, count]) => ({
        serviceName,
        count,
      })).sort(
        (first, second) =>
          second.count - first.count ||
          first.serviceName.localeCompare(second.serviceName),
      ),
      recentJobs: completedHistoryJobs
        .slice()
        .sort((first, second) => second.date.localeCompare(first.date))
        .map((job) => ({
          jobID: job.job_ID,
          bookingID: job.booking_ID,
          displayJobCode: job.id,
          serviceName: job.serviceType,
          customerName: job.customerName,
          date: job.date,
          formattedDate: job.formattedDate,
          status: job.status,
        })),
    },
    availability: {
      rating: Number.isFinite(technician.technician_rating),
      customerSatisfaction: false,
      onTimeArrival: false,
      reports: false,
      followUpPerformance: false,
      performanceTrend: false,
    },
  }
}

export function selectTechnicianFollowUps(entityState, technician_ID) {
  const bookings = getCollection(entityState, 'bookings')
  const workRelationships = getCollection(entityState, 'work')
  const serviceReports = getCollection(entityState, 'serviceReports')
  const indexes = createEntityIndexes(entityState)
  const followUpBookingIds = new Set(
    bookings
      .filter(
        (booking) =>
          booking.technician_ID === technician_ID && booking.isFollowup === true,
      )
      .map((booking) => booking.booking_ID),
  )
  const reportByJobId = new Map()
  const seenRelationships = new Set()

  serviceReports.forEach((report) => {
    if (!reportByJobId.has(report.job_id)) {
      reportByJobId.set(report.job_id, report)
    }
  })

  return workRelationships
    .filter((relationship) => followUpBookingIds.has(relationship.booking_ID))
    .map((relationship) => {
      const relationshipKey = `${relationship.booking_ID}:${relationship.job_ID}`

      if (seenRelationships.has(relationshipKey)) return null
      seenRelationships.add(relationshipKey)

      const booking = indexes.bookingById.get(relationship.booking_ID)
      const job = indexes.jobById.get(relationship.job_ID)
      const jobViewModel = createJobViewModel(relationship, indexes)

      if (!booking || !job || !jobViewModel) return null

      const report = reportByJobId.get(job.job_ID)
      const followUpViewModel = {
        bookingID: booking.booking_ID,
        jobID: job.job_ID,
        customerID: booking.customer_ID,
        technicianID: booking.technician_ID,
        id: jobViewModel.id,
        customerName: jobViewModel.customerName,
        customerPhone: jobViewModel.customerPhone,
        customerEmail: jobViewModel.customerEmail,
        // Compatibility label until the Service entity/API contract is available.
        serviceName: jobViewModel.serviceType,
        serviceType: jobViewModel.serviceType,
        serviceCategory: jobViewModel.serviceCategory,
        date: booking.date,
        formattedDate: jobViewModel.formattedDate,
        time: booking.time,
        estimatedDuration: jobViewModel.estimatedDuration,
        location: booking.location,
        address: booking.location,
        postalCode: jobViewModel.postalCode,
        unitType: jobViewModel.unitType,
        notes: jobViewModel.notes,
        status: booking.status || job.job_status,
        jobStatus: job.job_status,
        isFollowupBooking: true,
      }

      if (booking.status) {
        followUpViewModel.bookingStatus = booking.status
      }

      if (job.serviceID !== null && job.serviceID !== undefined) {
        followUpViewModel.serviceID = job.serviceID
      }

      if (typeof job.isFollowup === 'boolean') {
        followUpViewModel.isFollowupJob = job.isFollowup
      }

      if (report) {
        followUpViewModel.reportID = report.reportID

        if (typeof report.isFollowup === 'boolean') {
          followUpViewModel.isFollowupReport = report.isFollowup
        }
      }

      return followUpViewModel
    })
    .filter(Boolean)
}

export function selectTechnicianPartsLog(entityState, technician_ID) {
  const serviceReports = getCollection(entityState, 'serviceReports')
  const partsUsed = getCollection(entityState, 'partsUsed')
  const inventoryItems = getCollection(entityState, 'inventoryItems')
  const workRelationships = getCollection(entityState, 'work')
  const indexes = createEntityIndexes(entityState)
  const inventoryById = indexBy(inventoryItems, 'itemID')
  const workByJobId = indexBy(workRelationships, 'job_ID')
  const partsByReportId = new Map()

  partsUsed.forEach((relationship) => {
    if (!partsByReportId.has(relationship.reportID)) {
      partsByReportId.set(relationship.reportID, [])
    }

    partsByReportId.get(relationship.reportID).push(relationship)
  })

  return serviceReports
    .filter(
      (report) =>
        report.technicianID === technician_ID &&
        report.reportID !== null &&
        report.reportID !== undefined,
    )
    .flatMap((report) => {
      const reportParts = partsByReportId.get(report.reportID) || []
      const job = indexes.jobById.get(report.job_id)
      const workRelationship = job ? workByJobId.get(job.job_ID) : null
      const booking = workRelationship
        ? indexes.bookingById.get(workRelationship.booking_ID)
        : null
      const bookingPresentation = booking
        ? indexes.bookingPresentationById.get(booking.booking_ID)
        : null
      const customerPresentation = booking
        ? indexes.customerPresentationById.get(booking.customer_ID)
        : null
      const jobPresentation = job
        ? indexes.jobPresentationById.get(job.job_ID)
        : null

      return reportParts
        .map((relationship) => {
          const inventoryItem = inventoryById.get(relationship.itemID)

          // A usage record is valid only when its core report-item relationship
          // resolves. Job, booking, customer, and service context remain optional.
          if (!inventoryItem) return null

          return {
            reportID: report.reportID,
            jobID: job?.job_ID ?? report.job_id ?? null,
            bookingID: booking?.booking_ID ?? null,
            technicianID: report.technicianID,
            customerID: booking?.customer_ID ?? null,
            itemID: inventoryItem.itemID,
            itemName: inventoryItem.itemName,
            itemType: inventoryItem.itemType,
            itemDescription: inventoryItem.description,
            currentStock: inventoryItem.stock,
            bookingDate: booking?.date ?? null,
            bookingTime: booking?.time ?? null,
            location: booking?.location ?? null,
            jobStatus: job?.job_status ?? null,
            displayJobCode: jobPresentation?.displayJobCode ?? null,
            customerName: customerPresentation?.customerName ?? null,
            // Compatibility label until the Service entity/API is available.
            serviceName: jobPresentation?.serviceType ?? null,
            formattedDate: bookingPresentation?.formattedDate ?? null,
          }
        })
        .filter(Boolean)
    })
}

export function selectInventoryItems(entityState) {
  return getCollection(entityState, 'inventoryItems').filter((item) => !item.isDeleted)
}

export function selectCurrentTechnicianContext(user_ID = CURRENT_TECHNICIAN_USER_ID) {
  return selectTechnicianContext(TECHNICIAN_MOCK_ENTITY_STATE, user_ID)
}

export function selectCurrentTechnicianProfileViewModel(
  user_ID = CURRENT_TECHNICIAN_USER_ID,
) {
  return selectTechnicianProfile(TECHNICIAN_MOCK_ENTITY_STATE, user_ID)
}

export function selectAssignedJobViewModels(
  technician_ID = CURRENT_TECHNICIAN_ENTITY_ID,
) {
  return selectAssignedJobs(TECHNICIAN_MOCK_ENTITY_STATE, technician_ID)
}

export function selectReportableJobViewModels(
  technician_ID = CURRENT_TECHNICIAN_ENTITY_ID,
) {
  return selectReportableJobs(TECHNICIAN_MOCK_ENTITY_STATE, technician_ID)
}

export function selectCurrentInventoryItems() {
  return selectInventoryItems(TECHNICIAN_MOCK_ENTITY_STATE)
}

export function selectCurrentTechnicianJobHistoryViewModels(
  technician_ID = CURRENT_TECHNICIAN_ENTITY_ID,
) {
  return selectTechnicianJobHistory(TECHNICIAN_MOCK_ENTITY_STATE, technician_ID)
}

export function selectCurrentTechnicianPerformanceViewModel(
  technician_ID = CURRENT_TECHNICIAN_ENTITY_ID,
) {
  return selectTechnicianPerformance(
    TECHNICIAN_MOCK_ENTITY_STATE,
    technician_ID,
  )
}

export function selectCurrentTechnicianFollowUpViewModels(
  technician_ID = CURRENT_TECHNICIAN_ENTITY_ID,
) {
  return selectCurrentTechnicianFollowUpDataSource(technician_ID).records
}

export function selectCurrentTechnicianFollowUpDataSource(
  technician_ID = CURRENT_TECHNICIAN_ENTITY_ID,
) {
  const entityRecords = selectTechnicianFollowUps(
    TECHNICIAN_MOCK_ENTITY_STATE,
    technician_ID,
  )

  if (entityRecords.length > 0) {
    return { records: entityRecords, source: 'entity' }
  }

  return {
    records: selectTechnicianFollowUpDemoViewModels(technician_ID),
    source: 'demo',
  }
}

export function selectCurrentTechnicianPartsLogViewModels(
  technician_ID = CURRENT_TECHNICIAN_ENTITY_ID,
) {
  return selectCurrentTechnicianPartsLogDataSource(technician_ID).records
}

export function selectCurrentTechnicianPartsLogDataSource(
  technician_ID = CURRENT_TECHNICIAN_ENTITY_ID,
) {
  const entityRecords = selectTechnicianPartsLog(
    TECHNICIAN_MOCK_ENTITY_STATE,
    technician_ID,
  )

  if (entityRecords.length > 0) {
    return { records: entityRecords, source: 'entity' }
  }

  return {
    records: selectTechnicianPartsLogDemoViewModels(technician_ID),
    source: 'demo',
  }
}

export function selectCurrentTechnicianJobViewModels() {
  const technician = selectCurrentTechnicianContext()

  return technician ? selectAssignedJobViewModels(technician.technician_ID) : []
}
