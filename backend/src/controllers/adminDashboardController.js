/**
 * Cool Fix - Admin Dashboard Controller
 * Fetches real metrics across [new_jobBooking].[Booking], [user3].[technician], and [user3].[newCustomer]
 */

const { poolPromise } = require('../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, stats: {}, recentBookings: [] });

    // 1. Query booking counts
    const bookingStatsQuery = `
      SELECT 
        COUNT(*) AS totalBookings,
        SUM(CASE WHEN LOWER([status]) = 'pending' THEN 1 ELSE 0 END) AS pendingBookings
      FROM [new_jobBooking].[Booking]
    `;

    // 2. Query technician count
    const techStatsQuery = `
      SELECT COUNT(*) AS activeTechnicians FROM [user3].[technician]
    `;

    // 3. Query total customer count
    const customerStatsQuery = `
      SELECT COUNT(*) AS totalCustomers FROM [user3].[newCustomer]
    `;

    // 4. Query recent 5 bookings
    const recentBookingsQuery = `
      SELECT TOP 5
        b.booking_ID,
        b.customer_ID,
        b.technician_ID,
        CONVERT(VARCHAR(10), b.[date], 120) AS booking_date,
        b.status,
        ISNULL(c.customer_name, 'Guest Customer') AS customer_name,
        ISNULL(tech.technician_name, 'Unassigned') AS technician_name
      FROM [new_jobBooking].[Booking] b
      LEFT JOIN [user3].[newCustomer] c ON b.customer_ID = c.customer_ID
      LEFT JOIN [user3].[technician] tech ON b.technician_ID = tech.technician_ID
      ORDER BY b.booking_ID DESC
    `;

    const [bRes, tRes, cRes, recentRes] = await Promise.all([
      pool.request().query(bookingStatsQuery),
      pool.request().query(techStatsQuery),
      pool.request().query(customerStatsQuery),
      pool.request().query(recentBookingsQuery),
    ]);

    const bData = bRes.recordset[0] || {};
    const tData = tRes.recordset[0] || {};
    const cData = cRes.recordset[0] || {};

    return res.status(200).json({
      success: true,
      stats: {
        totalBookings: bData.totalBookings || 0,
        pendingBookings: bData.pendingBookings || 0,
        activeTechnicians: tData.activeTechnicians || 0,
        totalCustomers: cData.totalCustomers || 0,
      },
      recentBookings: recentRes.recordset || [],
    });
  } catch (err) {
    console.error('[Cool Fix] Dashboard Stats Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};