import {
  CURRENT_TECHNICIAN_ENTITY_ID,
  CURRENT_TECHNICIAN_USER_ID,
  TECHNICIAN_MOCK_ENTITY_STATE,
} from './technicianMockEntities'

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

export function selectInventoryItems(entityState) {
  return getCollection(entityState, 'inventoryItems').filter((item) => !item.isDeleted)
}

export function selectCurrentTechnicianContext(user_ID = CURRENT_TECHNICIAN_USER_ID) {
  return selectTechnicianContext(TECHNICIAN_MOCK_ENTITY_STATE, user_ID)
}

export function selectAssignedJobViewModels(
  technician_ID = CURRENT_TECHNICIAN_ENTITY_ID,
) {
  return selectAssignedJobs(TECHNICIAN_MOCK_ENTITY_STATE, technician_ID)
}

export function selectCurrentInventoryItems() {
  return selectInventoryItems(TECHNICIAN_MOCK_ENTITY_STATE)
}

export function selectCurrentTechnicianJobHistoryViewModels(
  technician_ID = CURRENT_TECHNICIAN_ENTITY_ID,
) {
  return selectTechnicianJobHistory(TECHNICIAN_MOCK_ENTITY_STATE, technician_ID)
}

export function selectCurrentTechnicianJobViewModels() {
  const technician = selectCurrentTechnicianContext()

  return technician ? selectAssignedJobViewModels(technician.technician_ID) : []
}
