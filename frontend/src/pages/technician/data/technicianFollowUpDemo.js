/**
 * Temporary frontend-only Follow-Up demonstration records.
 *
 * These fixtures already use the normalized Follow-Up view-model shape consumed
 * by the page. They are not merged into the ER-style mock collections, are not
 * persisted, and should be replaced by an API-provided view-model source later.
 * All numeric identifiers below are demo compatibility references only.
 */
const TECHNICIAN_FOLLOW_UP_DEMO_VIEW_MODELS = Object.freeze([
  Object.freeze({
    bookingID: 8_100_001,
    jobID: 8_200_001,
    reportID: 8_400_001,
    customerID: 8_300_001,
    technicianID: 101,
    serviceID: 501,
    id: 'J-FU-2026-001',
    customerName: 'Mei Lin Koh',
    serviceName: 'Cooling Performance Review',
    date: '2026-07-30',
    formattedDate: 'Thu, 30 Jul 2026',
    time: '09:00 AM',
    location: '18 Toa Payoh Lorong 7, Singapore 310018',
    status: 'Upcoming',
    bookingStatus: 'Upcoming',
    jobStatus: 'Upcoming',
    isFollowupBooking: true,
    isFollowupJob: true,
    isFollowupReport: true,
  }),
  Object.freeze({
    bookingID: 8_100_002,
    jobID: 8_200_002,
    reportID: 8_400_002,
    customerID: 8_300_002,
    technicianID: 101,
    serviceID: 502,
    id: 'J-FU-2026-002',
    customerName: 'Daniel Tan',
    serviceName: 'Drainage Reinspection',
    date: '2026-07-29',
    formattedDate: 'Wed, 29 Jul 2026',
    time: '02:30 PM',
    location: '62 Punggol Central, Singapore 828761',
    status: 'In Progress',
    bookingStatus: 'In Progress',
    jobStatus: 'In Progress',
    isFollowupBooking: true,
    isFollowupJob: true,
    isFollowupReport: true,
  }),
  Object.freeze({
    bookingID: 8_100_003,
    jobID: 8_200_003,
    reportID: 8_400_003,
    customerID: 8_300_003,
    technicianID: 101,
    serviceID: 503,
    id: 'J-FU-2026-003',
    customerName: 'Aisha Rahman',
    serviceName: 'Refrigerant Leak Verification',
    date: '2026-07-28',
    formattedDate: 'Tue, 28 Jul 2026',
    time: '11:00 AM',
    location: '7 Tampines Avenue 8, Singapore 529596',
    status: 'Completed',
    bookingStatus: 'Completed',
    jobStatus: 'Completed',
    isFollowupBooking: true,
    isFollowupJob: true,
    isFollowupReport: true,
  }),
  Object.freeze({
    bookingID: 8_100_004,
    jobID: 8_200_004,
    customerID: 8_300_004,
    technicianID: 101,
    serviceID: 504,
    id: 'J-FU-2026-004',
    customerName: 'Jonathan Lim',
    serviceName: 'Noise and Vibration Check',
    date: '2026-08-01',
    formattedDate: 'Sat, 1 Aug 2026',
    time: '10:30 AM',
    location: '91 Bukit Batok West Avenue 2, Singapore 659205',
    status: 'Upcoming',
    bookingStatus: 'Upcoming',
    jobStatus: 'Upcoming',
    isFollowupBooking: true,
    isFollowupJob: true,
    isFollowupReport: false,
  }),
])

export function selectTechnicianFollowUpDemoViewModels(technicianID) {
  return TECHNICIAN_FOLLOW_UP_DEMO_VIEW_MODELS
    .filter((record) => record.technicianID === technicianID)
    .map((record) => ({ ...record }))
}
