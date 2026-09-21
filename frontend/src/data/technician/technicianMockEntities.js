import { MOCK_JOBS } from './mockJobs'

const CURRENT_USER_ID = 1
const CURRENT_TECHNICIAN_ID = 101

function freezeCollection(records) {
  return Object.freeze(records.map((record) => Object.freeze(record)))
}

// These IDs are explicit frontend compatibility references, not backend primary keys.
// The complete legacy job code is the lookup key so IDs never depend on array order or
// a partial code. Customer references are assigned independently; two bookings should
// share one only when the fixture explicitly confirms that they belong to one customer.
const LEGACY_ASSIGNMENT_COMPATIBILITY_BY_JOB_CODE = Object.freeze({
  'J-2026-011': Object.freeze({
    job_ID: 1_000_001,
    booking_ID: 2_000_001,
    customerRef: 'legacy-customer-sarah-tan',
  }),
  'J-2026-012': Object.freeze({
    job_ID: 1_000_002,
    booking_ID: 2_000_002,
    customerRef: 'legacy-customer-ahmad-razali',
  }),
  'J-2026-013': Object.freeze({
    job_ID: 1_000_003,
    booking_ID: 2_000_003,
    customerRef: 'legacy-customer-priya-nair',
  }),
  'J-2026-014': Object.freeze({
    job_ID: 1_000_004,
    booking_ID: 2_000_004,
    customerRef: 'legacy-customer-lina-hassan',
  }),
  'J-2026-015': Object.freeze({
    job_ID: 1_000_005,
    booking_ID: 2_000_005,
    customerRef: 'legacy-customer-kelvin-lee',
  }),
  'J-2026-016': Object.freeze({
    job_ID: 1_000_006,
    booking_ID: 2_000_006,
    customerRef: 'legacy-customer-david-wong',
  }),
})

const LEGACY_CUSTOMER_COMPATIBILITY_IDS = Object.freeze({
  'legacy-customer-sarah-tan': 3_000_001,
  'legacy-customer-ahmad-razali': 3_000_002,
  'legacy-customer-priya-nair': 3_000_003,
  'legacy-customer-lina-hassan': 3_000_004,
  'legacy-customer-kelvin-lee': 3_000_005,
  'legacy-customer-david-wong': 3_000_006,
})

function assertUniqueIntegerIds(ids, label) {
  if (!ids.every(Number.isInteger) || new Set(ids).size !== ids.length) {
    throw new Error(`Technician mock compatibility ${label} IDs must be unique integers.`)
  }
}

function buildLegacyEntityIds() {
  const legacyJobCodes = MOCK_JOBS.map((legacyJob) => legacyJob.id)

  if (new Set(legacyJobCodes).size !== legacyJobCodes.length) {
    throw new Error('Technician mock legacy job codes must be unique.')
  }

  const resolvedEntries = legacyJobCodes.map((jobCode) => {
    const assignment = LEGACY_ASSIGNMENT_COMPATIBILITY_BY_JOB_CODE[jobCode]
    const customer_ID = assignment
      ? LEGACY_CUSTOMER_COMPATIBILITY_IDS[assignment.customerRef]
      : undefined

    if (!assignment || !Number.isInteger(customer_ID)) {
      throw new Error(`Missing Technician compatibility IDs for legacy job ${jobCode}.`)
    }

    return [
      jobCode,
      Object.freeze({
        job_ID: assignment.job_ID,
        booking_ID: assignment.booking_ID,
        customer_ID,
      }),
    ]
  })

  assertUniqueIntegerIds(
    resolvedEntries.map(([, ids]) => ids.job_ID),
    'job',
  )
  assertUniqueIntegerIds(
    resolvedEntries.map(([, ids]) => ids.booking_ID),
    'booking',
  )
  assertUniqueIntegerIds(Object.values(LEGACY_CUSTOMER_COMPATIBILITY_IDS), 'customer')

  return Object.freeze(Object.fromEntries(resolvedEntries))
}

const LEGACY_ENTITY_IDS = buildLegacyEntityIds()

// Authentication secrets intentionally never belong in frontend data.
export const USERS = freezeCollection([
  {
    user_ID: CURRENT_USER_ID,
    username: 'marcus.lee',
    accountType: 'Technician',
    isDeleted: false,
  },
])

export const TECHNICIANS = freezeCollection([
  {
    technician_ID: CURRENT_TECHNICIAN_ID,
    technician_name: 'Marcus Lee',
    // The ER specifies an integer, while the current UI presents 4.9; keep unresolved for now.
    technician_rating: null,
    user_ID: CURRENT_USER_ID,
  },
])

export const BOOKINGS = freezeCollection(
  MOCK_JOBS.map((legacyJob) => {
    const ids = LEGACY_ENTITY_IDS[legacyJob.id]

    return {
      booking_ID: ids.booking_ID,
      customer_ID: ids.customer_ID,
      technician_ID: CURRENT_TECHNICIAN_ID,
      date: legacyJob.date,
      time: legacyJob.time,
      // Ownership and synchronization of follow-up/status fields need API confirmation.
      isFollowup: null,
      location: legacyJob.address,
      status: null,
    }
  }),
)

export const WORK = freezeCollection(
  MOCK_JOBS.map((legacyJob) => {
    const ids = LEGACY_ENTITY_IDS[legacyJob.id]

    return {
      booking_ID: ids.booking_ID,
      job_ID: ids.job_ID,
    }
  }),
)

export const JOBS = freezeCollection(
  MOCK_JOBS.map((legacyJob) => {
    const ids = LEGACY_ENTITY_IDS[legacyJob.id]

    return {
      job_ID: ids.job_ID,
      job_status: legacyJob.status,
      isFollowup: null,
      serviceReport: null,
      // The referenced service entity is not yet defined in the confirmed frontend contract.
      serviceID: null,
    }
  }),
)

export const JOB_HISTORY = freezeCollection(
  MOCK_JOBS.filter((legacyJob) => legacyJob.status === 'Completed').map((legacyJob) => ({
    technician_ID: CURRENT_TECHNICIAN_ID,
    job_ID: LEGACY_ENTITY_IDS[legacyJob.id].job_ID,
  })),
)

export const SERVICE_REPORTS = freezeCollection([])
export const PARTS_USED = freezeCollection([])
// Frontend compatibility inventory only. These IDs are not backend primary keys.
export const INVENTORY_ITEMS = freezeCollection([
  {
    itemID: 4_000_001,
    itemType: 'Consumable',
    itemName: 'Air Filter',
    stock: 42,
    description: 'Replacement filter media for compatible indoor fan-coil units.',
    isDeleted: false,
  },
  {
    itemID: 4_000_002,
    itemType: 'Refrigerant',
    itemName: 'R32 Refrigerant',
    stock: 18,
    description: 'Refrigerant stock for compatible R32 air-conditioning systems.',
    isDeleted: false,
  },
  {
    itemID: 4_000_003,
    itemType: 'Refrigerant',
    itemName: 'R410A Refrigerant',
    stock: 14,
    description: 'Refrigerant stock for compatible R410A air-conditioning systems.',
    isDeleted: false,
  },
  {
    itemID: 4_000_004,
    itemType: 'Aircon Part',
    itemName: 'PVC Drain Hose',
    stock: 24,
    description: 'Replacement condensate drainage hose for indoor units.',
    isDeleted: false,
  },
  {
    itemID: 4_000_005,
    itemType: 'Consumable',
    itemName: 'Insulation Tape',
    stock: 37,
    description: 'Insulation finishing tape for refrigerant piping and service work.',
    isDeleted: false,
  },
  {
    itemID: 4_000_006,
    itemType: 'Aircon Part',
    itemName: 'Condensate Drain Pump',
    stock: 6,
    description: 'Replacement pump for condensate drainage installations.',
    isDeleted: false,
  },
])
export const TOOLS = freezeCollection([])
export const DISPOSABLE_TOOLS = freezeCollection([])
export const AIRCON_PARTS = freezeCollection([])

// These records preserve UI information whose final ER ownership is not confirmed.
export const TECHNICIAN_PRESENTATION = freezeCollection([
  {
    technician_ID: CURRENT_TECHNICIAN_ID,
    firstName: 'Marcus',
    roleLabel: 'Field Technician',
    averageRating: 4.9,
  },
])

const customerPresentationById = new Map()

MOCK_JOBS.forEach((legacyJob) => {
  const ids = LEGACY_ENTITY_IDS[legacyJob.id]

  if (!customerPresentationById.has(ids.customer_ID)) {
    customerPresentationById.set(ids.customer_ID, {
      customer_ID: ids.customer_ID,
      customerName: legacyJob.customerName,
      customerPhone: legacyJob.customerPhone,
      customerEmail: legacyJob.customerEmail,
    })
  }
})

export const CUSTOMER_PRESENTATION = freezeCollection(
  Array.from(customerPresentationById.values()),
)

export const BOOKING_PRESENTATION = freezeCollection(
  MOCK_JOBS.map((legacyJob) => ({
    booking_ID: LEGACY_ENTITY_IDS[legacyJob.id].booking_ID,
    formattedDate: legacyJob.formattedDate,
    postalCode: legacyJob.postalCode,
  })),
)

export const JOB_PRESENTATION = freezeCollection(
  MOCK_JOBS.map((legacyJob) => ({
    job_ID: LEGACY_ENTITY_IDS[legacyJob.id].job_ID,
    displayJobCode: legacyJob.id,
    serviceType: legacyJob.serviceType,
    serviceCategory: legacyJob.serviceCategory,
    estimatedDuration: legacyJob.estimatedDuration,
    timeframe: legacyJob.timeframe,
    unitType: legacyJob.unitType,
    notes: legacyJob.notes,
    priority: legacyJob.priority,
  })),
)

export const CURRENT_TECHNICIAN_USER_ID = CURRENT_USER_ID
export const CURRENT_TECHNICIAN_ENTITY_ID = CURRENT_TECHNICIAN_ID

export const TECHNICIAN_MOCK_ENTITY_STATE = Object.freeze({
  users: USERS,
  technicians: TECHNICIANS,
  bookings: BOOKINGS,
  work: WORK,
  jobs: JOBS,
  jobHistory: JOB_HISTORY,
  serviceReports: SERVICE_REPORTS,
  partsUsed: PARTS_USED,
  inventoryItems: INVENTORY_ITEMS,
  tools: TOOLS,
  disposableTools: DISPOSABLE_TOOLS,
  airconParts: AIRCON_PARTS,
  presentation: Object.freeze({
    technicians: TECHNICIAN_PRESENTATION,
    customers: CUSTOMER_PRESENTATION,
    bookings: BOOKING_PRESENTATION,
    jobs: JOB_PRESENTATION,
  }),
})
