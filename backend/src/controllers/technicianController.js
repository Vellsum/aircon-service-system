/**
 * Cool Fix - Technician Controller
 * Maps Azure SQL database tables [new_jobBooking].[Booking] & [user3].[newCustomer]
 *
 * CHANGELOG — 6 Oct 2026:
 *   1. rawTime now CONVERTed to VARCHAR in SQL ("HH:MM:SS"). Previously the
 *      mssql driver returned the TIME column as a JS Date, and string-parsing
 *      it produced garbage → the "undefined AM" display bug. Fixed at source.
 *   2. Added time24 ("HH:MM") to each job — used by the frontend start-gate.
 *   3. updateJobStatus enforces TWO rules:
 *        a) START GATE — cannot start before the booking date (and time, if
 *           ENFORCE_START_TIME is true).
 *        b) REPORT GATE — cannot complete until every linked job has a
 *           service report. Flow: Start → Submit Report → Complete.
 *   4. todayStr uses LOCAL date (was toISOString/UTC — wrong before 8am SGT).
 */

const { poolPromise, sql } = require('../config/db');

// 6 Oct 2026 — set false if time-strictness is too harsh for demos
const ENFORCE_START_TIME = true;

/* ---------------------------------------------------------------------------
 * Helpers — 6 Oct 2026
 * ------------------------------------------------------------------------- */

// Local date/time as strings (server timezone — see process.env.TZ in server.js)
function localDateStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function localTimeStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Format "HH:MM:SS" (from CONVERT in SQL) → "2:00 PM"
function formatTimeDisplay(raw, fallback = '09:00 AM') {
  if (!raw) return fallback;
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return s.includes('AM') || s.includes('PM') ? s : fallback;
  const h = Number(m[1]), min = m[2];
  if (isNaN(h)) return fallback;
  return `${h % 12 || 12}:${min} ${h >= 12 ? 'PM' : 'AM'}`;
}

/**
 * GET /api/technician/jobs
 * Returns formatted jobs & technician profile info
 */
const getAssignedJobs = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, jobs: [] });

    const techId = parseInt(req.query.techId, 10) || 1;

    // 1. Fetch Technician Name
    const techResult = await pool.request()
      .input('techId', sql.Int, techId)
      .query(`
        SELECT technician_ID, technician_name
        FROM [user3].[technician]
        WHERE technician_ID = @techId
      `);
    const techName = techResult.recordset[0]?.technician_name || 'Technician';

    // 2. Fetch Assigned Bookings
    //    6 Oct 2026: rawTime is CONVERTed to "HH:MM:SS" HERE — the TIME column
    //    arrives as a JS Date otherwise, which broke all string parsing
    //    downstream (root cause of "undefined AM").
    const query = `
      SELECT
        b.booking_ID,
        b.customer_ID,
        b.technician_ID,
        CONVERT(VARCHAR(10), b.[date], 120) AS cleanDate,
        CONVERT(VARCHAR(8),  b.[time], 108) AS rawTime,
        b.location,
        b.status,
        b.comments,
        ISNULL(b.isFollowup, 0) AS isFollowup,
        ISNULL(c.customer_name, 'Guest Customer') AS customer_name,
        ISNULL(c.customer_address, b.location) AS address
      FROM [new_jobBooking].[Booking] b
      LEFT JOIN [user3].[newCustomer] c ON b.customer_ID = c.customer_ID
      WHERE b.technician_ID = @techId
      ORDER BY b.[date] ASC, b.[time] ASC
    `;

    const result = await pool.request()
      .input('techId', sql.Int, techId)
      .query(query);

    // 6 Oct 2026: local date (toISOString() was UTC — "yesterday" before 8am SGT)
    const todayStr = localDateStr();

    const mappedJobs = (result.recordset || []).map((row) => {
      // ---- Date formatting ----
      const jobDate = row.cleanDate || todayStr;
      let formattedDate = jobDate;
      try {
        const d = new Date(jobDate + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('en-SG', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
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
        formattedDate,
        time: formatTimeDisplay(row.rawTime),            // "2:00 PM"
        time24: String(row.rawTime || '09:00:00').slice(0, 5), // 6 Oct 2026: "14:00" for the start-gate
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
      jobs: mappedJobs,
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

    const result = await pool.request()
      .input('techId', sql.Int, techId)
      .query(`
        SELECT
          COUNT(*) AS totalAssigned,
          SUM(CASE WHEN LOWER([status]) = 'pending' OR LOWER([status]) = 'assigned' THEN 1 ELSE 0 END) AS pendingJobs,
          SUM(CASE WHEN LOWER([status]) = 'completed' THEN 1 ELSE 0 END) AS completedJobs
        FROM [new_jobBooking].[Booking]
        WHERE technician_ID = @techId
      `);

    return res.status(200).json({ success: true, stats: result.recordset[0] || {} });
  } catch (err) {
    console.error('[Cool Fix] GET Technician Stats Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// PUT /api/technician/jobs/:bookingId/status
// 6 Oct 2026 — enforces TWO business rules:
//   (a) START GATE   — 'In Progress' only allowed on/after the booking slot
//   (b) REPORT GATE  — 'Completed' only allowed once every linked job has a
//                      service report (Start → Submit Report → Complete)
// =============================================================================
const updateJobStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, comments } = req.body;
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    const newStatus = String(status || '').trim();

    /* -------------------------------------------------------------------------
     * (a) START GATE — no starting before the scheduled date (and time)
     * ---------------------------------------------------------------------- */
    if (newStatus.toLowerCase() === 'in progress') {
      const b = await pool.request()
        .input('bookingId', sql.Int, Number(bookingId))
        .query(`
          SELECT CONVERT(VARCHAR(10), [date], 120) AS d,
                 CONVERT(VARCHAR(5),  [time], 108) AS t
          FROM [new_jobBooking].[Booking]
          WHERE booking_ID = @bookingId
        `);
      const row = b.recordset[0];
      if (!row) return res.status(404).json({ success: false, message: 'Booking not found' });

      const today = localDateStr();
      const nowTime = localTimeStr();

      if (row.d > today) {
        return res.status(400).json({ success: false,
          message: `This job is scheduled for ${row.d} — it cannot be started before its booking date.` });
      }
      if (ENFORCE_START_TIME && row.d === today && row.t > nowTime) {
        return res.status(400).json({ success: false,
          message: `This job is scheduled for today at ${row.t} — starting unlocks at that time.` });
      }
    }

        /* -------------------------------------------------------------------------
     * (b) REPORT GATE v2 — 6 Oct 2026.
     * submitReport saves reports with serviceReport.job_ID = booking_ID,
     * so the gate checks that link DIRECTLY, plus both legacy styles:
     * serviceReport.job_id → job → work → booking, and job.serviceReport FK.
     * Logs pass/reject to the terminal so failures are never invisible.
     * ---------------------------------------------------------------------- */
    if (newStatus.toLowerCase() === 'completed') {
      const check = await pool.request()
        .input('bookingId', sql.Int, Number(bookingId))
        .query(`
          SELECT TOP 1 reportID
          FROM [new_jobBooking].[serviceReport]
          WHERE job_ID = @bookingId
             OR job_ID IN (
                  SELECT j.job_ID
                  FROM [new_jobBooking].[work] w
                  JOIN [new_jobBooking].[job] j ON j.job_ID = w.job_ID
                  WHERE w.booking_ID = @bookingId
                )
             OR reportID IN (
                  SELECT j.serviceReport
                  FROM [new_jobBooking].[work] w
                  JOIN [new_jobBooking].[job] j ON j.job_ID = w.job_ID
                  WHERE w.booking_ID = @bookingId AND j.serviceReport IS NOT NULL
                )
        `);

      if (check.recordset.length === 0) {
        console.error(`[Cool Fix] REPORT GATE rejected booking #${bookingId}: no report found.`);
        return res.status(400).json({
          success: false,
          message: 'A service report must be submitted BEFORE completing this job. Submit the report first, then mark it completed.',
        });
      }
      console.log(`[Cool Fix] REPORT GATE passed for booking #${bookingId} (report #${check.recordset[0].reportID}).`);
    }

    const updateQuery = `
      UPDATE [new_jobBooking].[Booking]
      SET status = ISNULL(@statusVal, status),
          comments = ISNULL(@commentsVal, comments)
      WHERE booking_ID = @bookingId
    `;

    await pool.request()
      .input('bookingId', sql.Int, Number(bookingId))
      .input('statusVal', sql.VarChar(100), newStatus || null)
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
          jobsDone
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
        jobsDone: row.jobsDone || 0,
      },
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