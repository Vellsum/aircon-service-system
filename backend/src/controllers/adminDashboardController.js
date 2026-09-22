/**
 * Cool Fix - Admin Dashboard Controller
 * Connects directly to [new_jobBooking].[Booking] and [user3].[technician]
 */

const { poolPromise, sql } = require('../config/db');

/**
 * GET /api/admin/dashboard/stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(200).json({
        success: true,
        stats: { totalBookings: 0, totalTechnicians: 0, pendingBookings: 0, totalCustomers: 0 }
      });
    }

    const bookingQuery = `
      SELECT 
        COUNT(*) AS totalBookings,
        SUM(CASE WHEN LOWER([status]) = 'pending' OR LOWER([status]) = 'assigned' OR [status] IS NULL THEN 1 ELSE 0 END) AS pendingBookings
      FROM [new_jobBooking].[Booking]
    `;
    const bookingResult = await pool.request().query(bookingQuery);
    const bookingData = bookingResult.recordset[0] || {};

    const techQuery = `SELECT COUNT(*) AS totalTechnicians FROM [user3].[technician]`;
    const techResult = await pool.request().query(techQuery);
    const techData = techResult.recordset[0] || {};

    const customerQuery = `SELECT COUNT(*) AS totalCustomers FROM [user3].[newCustomer]`;
    const customerResult = await pool.request().query(customerQuery);
    const customerData = customerResult.recordset[0] || {};

    return res.status(200).json({
      success: true,
      stats: {
        totalBookings: bookingData.totalBookings || 0,
        pendingBookings: bookingData.pendingBookings || 0,
        totalTechnicians: techData.totalTechnicians || 0,
        totalCustomers: customerData.totalCustomers || 0,
      }
    });
  } catch (err) {
    console.error('[Cool Fix] GET Admin Dashboard Stats Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/dashboard/recent-bookings
 */
exports.getRecentBookings = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, bookings: [] });

    const query = `
      SELECT TOP 10
        b.booking_ID,
        CONVERT(VARCHAR(10), b.[date], 120) AS booking_date,
        b.time,
        ISNULL(b.status, 'Pending') AS status,
        ISNULL(c.customer_name, 'Guest Customer') AS customer_name,
        ISNULL(t.technician_name, 'Unassigned') AS technician_name
      FROM [new_jobBooking].[Booking] b
      LEFT JOIN [user3].[newCustomer] c ON b.customer_ID = c.customer_ID
      LEFT JOIN [user3].[technician] t ON b.technician_ID = t.technician_ID
      ORDER BY b.booking_ID DESC
    `;

    const result = await pool.request().query(query);

    return res.status(200).json({
      success: true,
      bookings: result.recordset || []
    });
  } catch (err) {
    console.error('[Cool Fix] GET Recent Bookings Error:', err.message);
    res.status(500).json({ success: false, message: err.message, bookings: [] });
  }
};

/**
 * GET /api/admin/dashboard/technicians
 */
exports.getTopTechnicians = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, technicians: [] });

    const query = `
      SELECT 
        t.technician_ID AS user_ID,
        ISNULL(t.technician_name, 'Technician') AS username,
        COUNT(b.booking_ID) AS jobsDone
      FROM [user3].[technician] t
      LEFT JOIN [new_jobBooking].[Booking] b ON t.technician_ID = b.technician_ID
      GROUP BY t.technician_ID, t.technician_name
      ORDER BY jobsDone DESC, t.technician_ID DESC
    `;

    const result = await pool.request().query(query);

    return res.status(200).json({
      success: true,
      technicians: result.recordset || []
    });
  } catch (err) {
    console.error('[Cool Fix] GET Top Technicians Error:', err.message);
    res.status(500).json({ success: false, message: err.message, technicians: [] });
  }
};