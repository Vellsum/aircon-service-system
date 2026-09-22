/**
 * Temporary frontend-only Parts Log demonstration view models.
 *
 * These records are intentionally kept outside the normalized mock entity
 * collections. They reuse existing Technician compatibility references and
 * inventory item IDs, but their report IDs are synthetic demonstration IDs.
 * Replace this source with normalized API data when a Technician Parts Log
 * endpoint is available.
 */
const TECHNICIAN_PARTS_LOG_DEMO_VIEW_MODELS = Object.freeze([
  Object.freeze({
    reportID: 8_500_002,
    jobID: 1_000_006,
    bookingID: 2_000_006,
    technicianID: 101,
    customerID: 3_000_006,
    itemID: 4_000_001,
    itemName: 'Air Filter',
    itemType: 'Consumable',
    itemDescription: 'Replacement filter media for compatible indoor fan-coil units.',
    currentStock: 42,
    bookingDate: '2026-07-28',
    bookingTime: '04:00 PM',
    location: '77 Marine Drive, #03-12',
    jobStatus: 'Completed',
    displayJobCode: 'J-2026-016',
    customerName: 'David Wong',
    serviceName: 'Airflow Inspection',
  }),
  Object.freeze({
    reportID: 8_500_002,
    jobID: 1_000_006,
    bookingID: 2_000_006,
    technicianID: 101,
    customerID: 3_000_006,
    itemID: 4_000_005,
    itemName: 'Insulation Tape',
    itemType: 'Consumable',
    itemDescription: 'Insulation finishing tape for refrigerant piping and service work.',
    currentStock: 37,
    bookingDate: '2026-07-28',
    bookingTime: '04:00 PM',
    location: '77 Marine Drive, #03-12',
    jobStatus: 'Completed',
    displayJobCode: 'J-2026-016',
    customerName: 'David Wong',
    serviceName: 'Airflow Inspection',
  }),
  Object.freeze({
    reportID: 8_500_001,
    jobID: 1_000_004,
    bookingID: 2_000_004,
    technicianID: 101,
    customerID: 3_000_004,
    itemID: 4_000_004,
    itemName: 'PVC Drain Hose',
    itemType: 'Aircon Part',
    itemDescription: 'Replacement condensate drainage hose for indoor units.',
    currentStock: 24,
    bookingDate: '2026-07-25',
    bookingTime: '11:00 AM',
    location: '210 Tampines St 23, #06-88',
    jobStatus: 'Completed',
    displayJobCode: 'J-2026-014',
    customerName: 'Lina Hassan',
    serviceName: 'General Servicing',
  }),
  Object.freeze({
    reportID: 8_500_001,
    jobID: 1_000_004,
    bookingID: 2_000_004,
    technicianID: 101,
    customerID: 3_000_004,
    itemID: 4_000_001,
    itemName: 'Air Filter',
    itemType: 'Consumable',
    itemDescription: 'Replacement filter media for compatible indoor fan-coil units.',
    currentStock: 42,
    bookingDate: '2026-07-25',
    bookingTime: '11:00 AM',
    location: '210 Tampines St 23, #06-88',
    jobStatus: 'Completed',
    displayJobCode: 'J-2026-014',
    customerName: 'Lina Hassan',
    serviceName: 'General Servicing',
  }),
])

export function selectTechnicianPartsLogDemoViewModels(technicianID) {
  return TECHNICIAN_PARTS_LOG_DEMO_VIEW_MODELS
    .filter((record) => record.technicianID === technicianID)
    .map((record) => ({ ...record }))
}
