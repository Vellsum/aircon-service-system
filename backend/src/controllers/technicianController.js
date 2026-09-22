/**
 * Cool Fix - Technician Controller
 * Maps Azure SQL database tables [new_jobBooking].[Booking] & [user3].[newCustomer]
 */

const { poolPromise, sql } = require('../config/db');

/**
 * GET /api/technician/jobs
 * Returns formatted jobs & technician profile info
 */
const getAssignedJobs = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, jobs: [] });

    const techId = parseInt(req.query.techId, 10) || 1;

    // 1. Fetch Technician Name from [user3].[technician] or fallback
    const techQuery = `
      SELECT technician_ID, technician_name 
      FROM [user3].[technician] 
      WHERE technician_ID = @techId
    `;
    const techResult = await pool.request()
      .input('techId', sql.Int, techId)
      .query(techQuery);
    
    const techName = techResult.recordset[0]?.technician_name || 'Technician';

    // 2. Fetch Assigned Bookings
    const query = `
      SELECT 
        b.booking_ID,
        b.customer_ID,
        b.technician_ID,
        CONVERT(VARCHAR(10), b.[date], 120) AS cleanDate,
        b.[time] AS rawTime,
        b.location,
        b.status,
        b.comments,
        ISNULL(b.isFollowup, 0) AS isFollowup,
        ISNULL(c.customer_name, 'Guest Customer') AS customer_name,
        ISNULL(c.customer_address, b.location) AS address
      FROM [new_jobBooking].[Booking] b
      LEFT JOIN [user3].[newCustomer] c ON b.customer_ID = c.customer_ID
      WHERE b.technician_ID = @techId OR b.technician_ID IS NULL
      ORDER BY b.booking_ID DESC
    `;

    const result = await pool.request()
      .input('techId', sql.Int, techId)
      .query(query);

    const todayStr = new Date().toISOString().split('T')[0];

    const mappedJobs = (result.recordset || []).map((row) => {
      // ---- Clean time parsing ----
      let displayTime = '09:00 AM';
      if (row.rawTime) {
        const timeStr = String(row.rawTime);
        if (timeStr.includes('T')) {
          // ISO timestamp: extract time portion
          const timePart = timeStr.split('T')[1].substring(0, 5); // "09:00"
          const [hours, minutes] = timePart.split(':').map(Number);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          displayTime = `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
        } else if (timeStr.includes(':')) {
          // Already has colon: "14:30" or "09:00 AM"
          if (timeStr.includes('AM') || timeStr.includes('PM')) {
            displayTime = timeStr;
          } else {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            displayTime = `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
          }
        } else {
          displayTime = timeStr;
        }
      }

      // ---- Clean date formatting ----
      const jobDate = row.cleanDate || todayStr;
      let formattedDate = jobDate;
      try {
        const d = new Date(jobDate + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('en-SG', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        }
      } catch { /* keep raw date */ }

      return {
        job_ID: row.booking_ID,
        id: `#BK${String(row.booking_ID).padStart(3, '0')}`,
        customerName: row.customer_name || 'Guest Customer',
        serviceType: 'Aircon Servicing',
        unitType: 'Wall-Mounted Split System',
        date: jobDate,
        formattedDate,               // ← NEW: human-readable date
        time: displayTime,            // ← IMPROVED: "2:30 PM" format
        estimatedDuration: '60 mins',
        timeframe: (jobDate === todayStr || !row.cleanDate) ? 'today' : 'this-week',
        status: row.status || 'Pending',
        address: row.address || 'Singapore',
        postalCode: '512345',
        isFollowup: Boolean(row.isFollowup),
        notes: row.comments || 'No special instructions.',
      };
    });

    return res.status(200).json({ 
      success: true, 
      technicianName: techName,
      jobs: mappedJobs 
    });
  } catch (err) {
    console.error('[Cool Fix] GET Technician Jobs Error:', err.message);
    res.status(500).json({ success: false, message: err.message, jobs: [] });
  }
};

/**
 * GET /api/technician/stats
 */
const getTechnicianStats = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, stats: {} });

    const techId = parseInt(req.query.techId, 10) || 1;

    const query = `
      SELECT 
        COUNT(*) AS totalAssigned,
        SUM(CASE WHEN LOWER([status]) = 'pending' OR LOWER([status]) = 'assigned' THEN 1 ELSE 0 END) AS pendingJobs,
        SUM(CASE WHEN LOWER([status]) = 'completed' THEN 1 ELSE 0 END) AS completedJobs
      FROM [new_jobBooking].[Booking]
      WHERE technician_ID = @techId
    `;

    const result = await pool.request()
      .input('techId', sql.Int, techId)
      .query(query);

    return res.status(200).json({ success: true, stats: result.recordset[0] || {} });
  } catch (err) {
    console.error('[Cool Fix] GET Technician Stats Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/technician/jobs/:bookingId/status
 */
const updateJobStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, comments } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    const updateQuery = `
      UPDATE [new_jobBooking].[Booking]
      SET status = ISNULL(@statusVal, status),
          comments = ISNULL(@commentsVal, comments)
      WHERE booking_ID = @bookingId
    `;

    await pool.request()
      .input('bookingId', sql.Int, Number(bookingId))
      .input('statusVal', sql.VarChar(100), status || null)
      .input('commentsVal', sql.VarChar(500), comments || null)
      .query(updateQuery);

    res.status(200).json({ success: true, message: 'Status updated successfully!' });
  } catch (err) {
    console.error('[Cool Fix] PUT Technician Status Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
/**
 * GET /api/technician/profile
 * Returns technician profile info (name, rating, specialty, jobsDone)
 */
const getTechnicianProfile = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, profile: null });

    const techId = parseInt(req.query.techId, 10) || 1;

    const result = await pool.request()
      .input('techId', sql.Int, techId)
      .query(`
        SELECT 
          technician_ID,
          technician_name,
          technician_rating,
          specialty,
          jobsDone      jobsDone
        FROM [user3].[technician]
        WHERE technician_ID = @techId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Technician not found' });
    }

    const row = result.recordset[0];
    res.json({
      success: true,
      profile: {
        technicianID: row.technician_ID,
        technicianName: row.technician_name,
        technicianRating: row.technician_rating,
        specialty: row.specialty || '',
        jobsDone: row.jobsDone || 0
      }
    });

  } catch (err) {
    console.error('[Cool Fix] GET Technician Profile Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAssignedJobs,
  getTechnicianStats,
  updateJobStatus,
  getTechnicianProfile,
};