/**
 * Cool Fix - Admin Booking Controller
 * Database Schema: [new_jobBooking].[Booking]
 *
 * CHANGELOG — 6 Oct 2026:
 *   1. [BUG] "Validation failed for parameter 'timeVal'. Invalid string" —
 *      the Booking.time column (SQL TIME) arrives from the driver as a JS
 *      Date object. Passing it to a VarChar parameter fails validation.
 *      Fixed: all times are normalized to "HH:MM:SS" strings via
 *      normalizeTimeToSql(), and the fallback SELECT CONVERTs the time.
 *   2. [RULE] Double-booking guard now compares date AND time (was date-only,
 *      which wrongly blocked same-day assignments at different times).
 *   3. [GAP] ensureJobLink(): every created/assigned booking now gets a
 *      job + work link — without it, the technician's completion gate
 *      rejects the booking ("No job is linked to this booking").
 */

const { poolPromise, sql } = require('../config/db');

/* ---------------------------------------------------------------------------
 * Helpers — 6 Oct 2026
 * ------------------------------------------------------------------------- */

// Normalize any incoming time shape → "HH:MM:SS" or null.
// Handles: null/"", "undefined", "2:30 PM", "14:30", "14:30:00".
// Never pass raw user input or JS Dates as sql.Time — normalize first.
function normalizeTimeToSql(t) {
  if (t === null || t === undefined) return null;
  const s = String(t).trim();
  if (!s || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') return null;

  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = Number(m12[1]) % 12;
    if (/pm/i.test(m12[3])) h += 12;
    return `${String(h).padStart(2, '0')}:${m12[2]}:00`;
  }
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m24) return `${String(Number(m24[1])).padStart(2, '0')}:${m24[2]}:${m24[3] || '00'}`;

  return null; // unrecognized → caller treats as "not provided"
}

// "YYYY-MM-DD" or null (no silent today-substitution on update paths)
function normalizeDateToSql(d) {
  if (!d) return null;
  const s = String(d).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * 6 Oct 2026 — every Booking MUST have a job + work link. Without it:
 * service names don't resolve on dashboards, reports can't attach, and the
 * technician completion gate rejects the booking.
 */
async function ensureJobLink(pool, bookingId, serviceId = null) {
  const has = await pool.request()
    .input('bid', sql.Int, Number(bookingId))
    .query(`SELECT 1 FROM [new_jobBooking].[work] WHERE booking_ID = @bid`);
  if (has.recordset.length > 0) return; // already linked

  let svcId = serviceId;
  if (!svcId) {
    const svc = await pool.request()
      .query(`SELECT TOP 1 service_id FROM [payables].[service] ORDER BY service_id`);
    svcId = svc.recordset[0]?.service_id;
  }
  if (!svcId) return;

  const j = await pool.request()
    .input('svc', sql.Int, svcId)
    .query(`INSERT INTO [new_jobBooking].[job] (job_status, isFollowup, serviceID)
            OUTPUT INSERTED.job_ID VALUES ('Assigned', 0, @svc)`);
  await pool.request()
    .input('jid', sql.Int, j.recordset[0].job_ID)
    .input('bid', sql.Int, Number(bookingId))
    .query(`INSERT INTO [new_jobBooking].[work] (job_ID, booking_ID) VALUES (@jid, @bid)`);
}

/**
 * GET /api/admin/bookings
 */
exports.getAllBookings = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, bookings: [] });

    const query = `
      SELECT 
        b.booking_ID,
        b.customer_ID,
        b.technician_ID,
        CONVERT(VARCHAR(10), b.[date], 120) AS booking_date,
        CONVERT(VARCHAR(8), b.[time], 108) AS [time],
        b.location,
        b.status,
        b.comments,
        ISNULL(c.customer_name, 'Guest Customer') AS customer_name,
        ISNULL(tech.technician_name, 'Unassigned') AS technician_name
      FROM [new_jobBooking].[Booking] b
      LEFT JOIN [user3].[newCustomer] c ON b.customer_ID = c.customer_ID
      LEFT JOIN [user3].[technician] tech ON b.technician_ID = tech.technician_ID
      ORDER BY b.booking_ID DESC
    `;

    const result = await pool.request().query(query);
    return res.status(200).json({ success: true, bookings: result.recordset || [] });
  } catch (err) {
    console.error('[Cool Fix] GET Bookings Error:', err.message);
    res.status(500).json({ success: false, message: err.message, bookings: [] });
  }
};

/**
 * GET /api/admin/bookings/technicians
 */
exports.getTechnicians = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, technicians: [] });

    const result = await pool.request()
      .query(`SELECT technician_ID, technician_name FROM [user3].[technician]`);

    res.status(200).json({ success: true, technicians: result.recordset || [] });
  } catch (err) {
    console.error('[Cool Fix] Fetch Technicians Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/bookings
 */
exports.createBooking = async (req, res) => {
  try {
    const { customer_ID, customer_name, technician_ID, booking_date, time, location, isFollowup, status, comments } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database connection offline' });

    let finalCustomerId = parseInt(customer_ID, 10);

    if (isNaN(finalCustomerId) || finalCustomerId <= 0) {
      const nameToInsert = customer_name && customer_name.trim() !== "" ? customer_name.trim() : "New Customer";
      const newCustResult = await pool.request()
        .input('custName', sql.VarChar(100), nameToInsert)
        .query(`INSERT INTO [user3].[newCustomer] (customer_name, customer_address, loyaltyPoints, bought_packages)
                OUTPUT INSERTED.customer_ID VALUES (@custName, 'Singapore', 0, 0)`);
      finalCustomerId = newCustResult.recordset[0].customer_ID;
    } else {
      const checkExisting = await pool.request()
        .input('cId', sql.Int, finalCustomerId)
        .query(`SELECT customer_ID FROM [user3].[newCustomer] WHERE customer_ID = @cId`);
      if (checkExisting.recordset.length === 0) {
        return res.status(400).json({ success: false, message: `Customer #${finalCustomerId} does not exist.` });
      }
    }

    let validTechId = parseInt(technician_ID, 10);
    if (!isNaN(validTechId) && validTechId > 0) {
      const techCheck = await pool.request()
        .input('tId', sql.Int, validTechId)
        .query(`SELECT technician_ID FROM [user3].[technician] WHERE technician_ID = @tId`);
      if (techCheck.recordset.length === 0) validTechId = null;
    } else {
      validTechId = null;
    }

    // 6 Oct 2026: date required (schema NOT NULL) — invalid input → today
    const formattedDate = normalizeDateToSql(booking_date) || new Date().toISOString().split('T')[0];
    // 6 Oct 2026: normalized time (fixes Invalid string crashes)
    const formattedTime = normalizeTimeToSql(time) || '09:00:00';

    const insertQuery = `
      INSERT INTO [new_jobBooking].[Booking] 
        (customer_ID, technician_ID, [date], [time], isFollowup, location, status, comments)
      OUTPUT INSERTED.booking_ID
      VALUES (@custId, @techId, @dateVal, @timeVal, @followupVal, @locationVal, ISNULL(@statusVal, 'Pending'), @commentsVal)
    `;

    const inserted = await pool.request()
      .input('custId', sql.Int, finalCustomerId)
      .input('techId', sql.Int, validTechId)
      .input('dateVal', sql.Date, formattedDate)
      .input('timeVal', sql.VarChar(8), formattedTime)
      .input('followupVal', sql.Bit, isFollowup ? 1 : 0)
      .input('locationVal', sql.VarChar(100), location || 'Singapore Main Branch')
      .input('statusVal', sql.VarChar(100), status || 'Pending')
      .input('commentsVal', sql.VarChar(500), comments || 'Service booking')
      .query(insertQuery);

    const newBookingId = inserted.recordset[0].booking_ID;

    // 6 Oct 2026: guarantee the job link so the completion gate passes later
    try { await ensureJobLink(pool, newBookingId); } catch (e) {
      console.error('[Cool Fix] ensureJobLink (create) skipped:', e.message);
    }

    res.status(201).json({ success: true, message: 'Cool Fix booking created successfully!', booking_ID: newBookingId });
  } catch (err) {
    console.error('[Cool Fix] SQL POST Error:', err.message);
    res.status(500).json({ success: false, message: `SQL Error: ${err.message}` });
  }
};

/**
 * PUT /api/admin/bookings/:bookingId/status
 */
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, technician_ID, technicianId, booking_date, time } = req.body;

    if (!bookingId || bookingId === 'undefined') {
      return res.status(400).json({ success: false, message: 'Invalid or missing Booking ID.' });
    }

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database connection offline' });

    // 1. Resolve technician ID (supports both key styles)
    const rawTechId = technician_ID !== undefined ? technician_ID : technicianId;
    const techIdProvided = rawTechId !== undefined && rawTechId !== null && String(rawTechId).trim() !== '';
    let validTechId = parseInt(rawTechId, 10);
    if (isNaN(validTechId) || validTechId <= 0) validTechId = null;

    // 2. Normalize incoming date/time — null means "leave unchanged"
    //    6 Oct 2026: normalizeTimeToSql fixes the Invalid-string crash
    let targetDate = normalizeDateToSql(booking_date);
    let targetTime = normalizeTimeToSql(time);

    // 3. Fallback: when assigning a tech, fill missing date/time from the booking
    if (validTechId !== null && (!targetDate || !targetTime)) {
      const currentBooking = await pool.request()
        .input('bId', sql.Int, Number(bookingId))
        .query(`
          SELECT CONVERT(VARCHAR(10), [date], 120) AS bookingDate,
                 CONVERT(VARCHAR(8),  [time], 108) AS bookingTime
          FROM [new_jobBooking].[Booking] 
          WHERE booking_ID = @bId
        `);
      if (currentBooking.recordset.length > 0) {
        if (!targetDate) targetDate = currentBooking.recordset[0].bookingDate;
        if (!targetTime) targetTime = currentBooking.recordset[0].bookingTime; // now a "HH:MM:SS" STRING
      }
    }

    // 4. DOUBLE-BOOKING GUARD — 6 Oct 2026: compares date AND time (was
    //    date-only, which wrongly blocked same-day different-time assignments)
    if (validTechId !== null && targetDate && targetTime) {
      const conflictCheck = await pool.request()
        .input('techId',    sql.Int,         validTechId)
        .input('dateVal',   sql.Date,        targetDate)
        .input('timeVal',   sql.VarChar(8),  targetTime)
        .input('bookingId', sql.Int,         Number(bookingId))
        .query(`
          SELECT COUNT(*) AS clashes
          FROM [new_jobBooking].[Booking]
          WHERE technician_ID = @techId
            AND booking_ID <> @bookingId
            AND [date] = @dateVal
            AND CONVERT(VARCHAR(5), [time], 108) = LEFT(@timeVal, 5)
            AND LOWER([status]) NOT IN ('cancelled')
        `);

      if (conflictCheck.recordset[0].clashes > 0) {
        return res.status(409).json({
          success: false,
          message: 'This technician already has a booking at that exact date and time. Choose a different technician or time slot.',
        });
      }
    }

    // 5. UPDATE — null params mean "leave unchanged"
    const updateQuery = `
      UPDATE [new_jobBooking].[Booking]
      SET status = ISNULL(@statusVal, status),
          technician_ID = CASE WHEN @techIdProvided = 1 THEN @techId ELSE technician_ID END,
          [date] = ISNULL(@dateVal, [date]),
          [time] = ISNULL(CONVERT(TIME, @timeVal), [time])
      WHERE booking_ID = @bookingId
    `;

    await pool.request()
      .input('bookingId',      sql.Int,          Number(bookingId))
      .input('statusVal',      sql.VarChar(100), status || null)
      .input('techIdProvided', sql.Bit,          techIdProvided ? 1 : 0)
      .input('techId',         sql.Int,          validTechId)
      .input('dateVal',        sql.Date,         targetDate)
      .input('timeVal',        sql.VarChar(8),   targetTime)
      .query(updateQuery);

    // 6. 6 Oct 2026: guarantee the job link whenever a technician is assigned
    if (techIdProvided && validTechId !== null) {
      try { await ensureJobLink(pool, bookingId); } catch (e) {
        console.error('[Cool Fix] ensureJobLink (assign) skipped:', e.message);
      }
    }

    console.log(`[Cool Fix] Updated booking #${bookingId} successfully!`);
    return res.status(200).json({ success: true, message: 'Cool Fix booking updated successfully!' });
  } catch (err) {
    console.error('[Cool Fix] SQL PUT Error:', err.message);
    return res.status(500).json({ success: false, message: `SQL Error: ${err.message}` });
  }
};