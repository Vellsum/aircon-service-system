/**
 * Cool Fix - Technician Controller
 * Maps Azure SQL database tables [new_jobBooking].[Booking] & [user3].[newCustomer]
 *
 * CHANGELOG — 6 Oct 2026 (v3):
 *   1. rawTime CONVERTed to VARCHAR in SQL (TIME columns arrive as JS Dates —
 *      root cause of the "undefined AM" display bug).
 *   2. time24 ("HH:MM") added to each job — used by the frontend start-gate.
 *   3. updateJobStatus enforces THREE rules, ALL logged to the terminal:
 *        a) START GATE    — cannot start before the booking date/time
 *        b) SEQUENCE GATE — cannot complete a job that is not In Progress
 *                           (fixes the misleading "submit report first" message
 *                           when the job was never started)
 *        c) REPORT GATE v2 — cannot complete without a service report
 *                           (checks all three link styles)
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
        customer_ID: row.customer_ID,
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
// 6 Oct 2026 — enforces THREE business rules, all logged to the terminal:
//   (a) START GATE    — 'In Progress' only allowed on/after the booking slot
//   (b) SEQUENCE GATE — 'Completed' only allowed from 'In Progress'
//   (c) REPORT GATE v2 — 'Completed' only allowed once a service report exists
//   Flow: 🔒 (until date) → Start → Submit Report → Complete
// =============================================================================
const updateJobStatus = async (req, res) => {
  let startTransaction;
  let startTransactionOpen = false;
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

      // 6 Oct 2026 (v3): start-gate rejections are now LOGGED (were silent before)
      if (row.d > today) {
        console.error(`[Cool Fix] START GATE rejected booking #${bookingId}: scheduled for ${row.d}.`);
        return res.status(400).json({ success: false,
          message: `This job is scheduled for ${row.d} — it cannot be started before its booking date.` });
      }
      if (ENFORCE_START_TIME && row.d === today && row.t > nowTime) {
        console.error(`[Cool Fix] START GATE rejected booking #${bookingId}: scheduled for today at ${row.t}.`);
        return res.status(400).json({ success: false,
          message: `This job is scheduled for today at ${row.t} — starting unlocks at that time.` });
      }
    }

    /* -------------------------------------------------------------------------
     * (b) SEQUENCE GATE — 6 Oct 2026 (v3): 'Completed' only allowed from
     *     'In Progress'. Without this, completing a never-started job produced
     *     the misleading "submit report first" message.
     * ---------------------------------------------------------------------- */
    if (newStatus.toLowerCase() === 'completed') {
      const cur = await pool.request()
        .input('bookingId', sql.Int, Number(bookingId))
        .query(`SELECT LOWER([status]) AS s FROM [new_jobBooking].[Booking] WHERE booking_ID = @bookingId`);
      const s = cur.recordset[0]?.s;
      if (s !== 'in progress') {
        console.error(`[Cool Fix] SEQUENCE GATE rejected booking #${bookingId}: status '${s || 'unknown'}', not In Progress.`);
        return res.status(400).json({
          success: false,
          message: `This job hasn't been started yet (status: ${s || 'unknown'}). Start it on its booking date, submit the report, then complete.`,
        });
      }
    }

    // Completion requires a report linked through this booking's work/job rows.
    if (newStatus.toLowerCase() === 'completed') {
      const check = await pool.request()
      .input('bookingId', sql.Int, Number(bookingId))
      .query(`
        SELECT TOP 1 reportID
        FROM [new_jobBooking].[serviceReport]
        WHERE reportID IN (
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
      if (newStatus.toLowerCase() === 'completed') {
        await pool.request().input('bid', sql.Int, Number(bookingId)).query(`
          UPDATE j SET j.job_status = 'Finished'
          FROM [new_jobBooking].[job] j JOIN [new_jobBooking].[work] w ON w.job_ID = j.job_ID
          WHERE w.booking_ID = @bid`);
      }
      console.log(`[Cool Fix] REPORT GATE passed for booking #${bookingId} (report #${check.recordset[0].reportID}).`);
    }

    // Run after the Start gate, independently of the completion-only report gate.
    if (newStatus.toLowerCase() === 'in progress') {
      startTransaction = new sql.Transaction(pool);
      startTransaction.on('rollback', () => { startTransactionOpen = false; });
      await startTransaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      startTransactionOpen = true;
      const lockedBooking = await new sql.Request(startTransaction)
        .input('bid', sql.Int, Number(bookingId))
        .query(`SELECT booking_ID FROM [new_jobBooking].[Booking] WITH (UPDLOCK, HOLDLOCK)
                WHERE booking_ID = @bid`);
      if (!lockedBooking.recordset.length) {
        throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
      }
      const startLinks = await new sql.Request(startTransaction)
        .input('bid', sql.Int, Number(bookingId))
        .query(`
          SELECT j.job_ID,
            (SELECT COUNT(*) FROM [new_jobBooking].[work] otherWork WITH (UPDLOCK, HOLDLOCK)
             WHERE otherWork.job_ID = w.job_ID AND otherWork.booking_ID <> @bid) AS otherBookingCount
          FROM [new_jobBooking].[work] w WITH (UPDLOCK, HOLDLOCK)
          LEFT JOIN [new_jobBooking].[job] j WITH (UPDLOCK, HOLDLOCK) ON j.job_ID = w.job_ID
          WHERE w.booking_ID = @bid
          ORDER BY j.job_ID
        `);
      if (!startLinks.recordset.length || startLinks.recordset.some((job) =>
        !Number.isSafeInteger(job.job_ID) || job.job_ID <= 0 || job.otherBookingCount !== 0)) {
        throw Object.assign(new Error('Cannot start service: this booking requires valid, independent service job links.'), { statusCode: 400 });
      }
      await new sql.Request(startTransaction).input('bid', sql.Int, Number(bookingId)).query(`
        UPDATE j SET j.job_status = 'In Progress'
        FROM [new_jobBooking].[job] j JOIN [new_jobBooking].[work] w ON w.job_ID = j.job_ID
        WHERE w.booking_ID = @bid`);
    }

    const updateQuery = `
      UPDATE [new_jobBooking].[Booking]
      SET status = ISNULL(@statusVal, status),
          comments = ISNULL(@commentsVal, comments)
      WHERE booking_ID = @bookingId
    `;

    const bookingRequest = startTransaction ? new sql.Request(startTransaction) : pool.request();
    await bookingRequest
      .input('bookingId', sql.Int, Number(bookingId))
      .input('statusVal', sql.VarChar(100), newStatus || null)
      .input('commentsVal', sql.VarChar(500), comments || null)
      .query(updateQuery);

    if (startTransaction) {
      await startTransaction.commit();
      startTransactionOpen = false;
    }
    console.log(`[Cool Fix] Booking #${bookingId} status set to '${newStatus}'.`);
    res.status(200).json({ success: true, message: 'Status updated successfully!' });
  } catch (err) {
    if (startTransactionOpen) {
      try {
        await startTransaction.rollback();
      } catch (rollbackError) {
        console.error('[Cool Fix] Start status rollback failed:', rollbackError.message);
      }
    }
    console.error('[Cool Fix] PUT Technician Status Error:', err.message);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
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

/* ---------------------------------------------------------------------------
 * POST /api/technician/reports
 * Contract = TechnicianSubmitReport.jsx buildReportPayload():
 *   { job_ID, findings[], findingsOther, actionsTaken[], actionsOther,
 *     overallCondition, checklistItems[], materials[{itemID,...}], materialsTotal,
 *     followUpRequired, followUpReasons[], followUpDate, followUpPriority,
 *     completionDateTime, customerAcknowledged }
 * Link style: job.serviceReport → serviceReport.reportID (only link in schema)
 * ------------------------------------------------------------------------- */
function parseBookingId(value) {
  if (value === null || value === undefined) return NaN;
  const m = String(value).match(/(\d+)/); // handles 1006, "1006", "#BK1006"
  return m ? Number(m[1]) : NaN;
}

const submitReport = async (req, res) => {
  let transaction;
  let transactionOpen = false;
  try {
    const body = req.body || {};
    const bookingId = parseBookingId(body.job_ID);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ success: false, error: 'A valid job/booking reference is required.' });
    }

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, error: 'Database offline' });

    transaction = new sql.Transaction(pool);
    transaction.on('rollback', () => { transactionOpen = false; });
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionOpen = true;

    const b = await new sql.Request(transaction)
      .input('bid', sql.Int, bookingId)
      .query(`
        SELECT booking_ID, customer_ID, technician_ID, location
        FROM [new_jobBooking].[Booking] WITH (UPDLOCK, HOLDLOCK)
        WHERE booking_ID = @bid
      `);
    const booking = b.recordset[0];
    if (!booking) {
      throw Object.assign(new Error(`Booking #${bookingId} not found.`), { statusCode: 404 });
    }

    const techId = Number(booking.technician_ID) || parseInt(req.query.techId, 10) || parseInt(body.technicianID, 10);
    if (!techId) {
      throw Object.assign(new Error('Cannot save report: no technician assigned to this booking yet.'), { statusCode: 400 });
    }

    // Lock the target links before inserting anything. A shared job would also
    // attach this report to another booking and break report retrieval identity.
    const linked = await new sql.Request(transaction)
      .input('bid', sql.Int, bookingId)
      .query(`
        SELECT j.job_ID, j.serviceID, j.serviceReport, s.service_id AS linkedServiceID,
          (SELECT COUNT(*) FROM [new_jobBooking].[work] otherWork WITH (UPDLOCK, HOLDLOCK)
           WHERE otherWork.job_ID = w.job_ID AND otherWork.booking_ID <> @bid) AS otherBookingCount
        FROM [new_jobBooking].[work] w WITH (UPDLOCK, HOLDLOCK)
        LEFT JOIN [new_jobBooking].[job] j WITH (UPDLOCK, HOLDLOCK) ON j.job_ID = w.job_ID
        LEFT JOIN [payables].[service] s ON s.service_id = j.serviceID
        WHERE w.booking_ID = @bid
        ORDER BY j.job_ID
      `);
    const linkedJobs = linked.recordset;
    if (!linkedJobs.length || linkedJobs.some((job) =>
      !Number.isSafeInteger(job.job_ID) || job.job_ID <= 0
      || !Number.isSafeInteger(job.serviceID) || job.serviceID <= 0
      || job.linkedServiceID !== job.serviceID || job.otherBookingCount !== 0)) {
      throw Object.assign(new Error('Cannot save report: this booking requires valid, independent service job links.'), { statusCode: 400 });
    }
    if (linkedJobs.some((job) => job.serviceReport != null)) {
      throw Object.assign(new Error('Cannot save report: a service report is already linked to this booking.'), { statusCode: 409 });
    }

    // Flatten the frontend arrays into report columns
    const arr = (v) => (Array.isArray(v) ? v.filter((x) => String(x || '').trim()) : []);
    const join = (v) => arr(v).join('; ');
    let findingsText = join(body.findings);
    if (body.findingsOther) findingsText = (findingsText ? findingsText + '; ' : '') + String(body.findingsOther);
    let actionsText = join(body.actionsTaken);
    if (body.actionsOther) actionsText = (actionsText ? actionsText + '; ' : '') + String(body.actionsOther);
    const checklistText = arr(body.checklistItems).join(', ');
    const followUpRequired = body.followUpRequired === true || body.followUpRequired === 'true' || body.followUpRequired === 1;
    let recommendationsText = '';
    if (followUpRequired) {
      const reasons = join(body.followUpReasons);
      recommendationsText = `Follow-up required (${body.followUpPriority || 'Normal'} priority)` +
        (reasons ? ` — ${reasons}` : '') +
        (body.followUpDate ? ` — recommended date ${body.followUpDate}` : '');
    }
    const materialRows = arr(body.materials);
    const notesText = [
      materialRows.length ? `Materials: ${materialRows.length} line(s), total SGD ${Number(body.materialsTotal || 0).toFixed(2)}` : null,
      body.customerAcknowledged ? 'Customer acknowledged the completed work.' : 'Customer acknowledgement not recorded.',
    ].filter(Boolean).join('. ');
    const descriptionText = `Service report for booking #${bookingId}` +
      (booking.location ? ` — ${booking.location}` : '');
    let completionVal = null;
    if (typeof body.completionDateTime === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(body.completionDateTime)) {
      completionVal = body.completionDateTime.slice(0, 19).replace('T', ' ');
    }

    const inserted = await new sql.Request(transaction)
      .input('tech', sql.Int, techId)
      .input('desc', sql.VarChar(500), descriptionText.slice(0, 500))
      .input('followup', sql.Bit, followUpRequired ? 1 : 0)
      .input('findings', sql.VarChar(300), findingsText || null)
      .input('actions', sql.VarChar(300), actionsText || null)
      .input('cond', sql.VarChar(200), body.overallCondition || null)
      .input('reco', sql.VarChar(200), recommendationsText || null)
      .input('notes', sql.VarChar(200), notesText || null)
      .input('checklist', sql.VarChar(500), checklistText || null)
      .input('completed', sql.DateTime2, completionVal || new Date())
      .query(`
        INSERT INTO [new_jobBooking].[serviceReport]
          (description, technicianID, isFollowup, findings, actionsTaken,
           AC_condition, recommendations, notes, serviceChecklist, completedDateTime)
        OUTPUT INSERTED.reportID
        VALUES (@desc, @tech, @followup, @findings, @actions, @cond, @reco, @notes, @checklist, @completed)
      `);
    const reportID = inserted.recordset[0].reportID;

    // Verify every locked job accepted the new report; zero/partial attachment
    // must roll back the report rather than returning an orphaned success.
    const attached = await new sql.Request(transaction)
      .input('rid', sql.Int, reportID)
      .input('bid', sql.Int, bookingId)
      .query(`
        UPDATE j SET j.serviceReport = @rid
        OUTPUT INSERTED.job_ID
        FROM [new_jobBooking].[job] j
        JOIN [new_jobBooking].[work] w ON w.job_ID = j.job_ID
        WHERE w.booking_ID = @bid
      `);
    const attachedJobIDs = new Set(attached.recordset.map((job) => job.job_ID));
    if (attached.recordset.length !== linkedJobs.length || attachedJobIDs.size !== linkedJobs.length
      || linkedJobs.some((job) => !attachedJobIDs.has(job.job_ID))) {
      throw new Error('Service report could not be attached to all of this booking\'s service jobs.');
    }

    // Material links are part of the same report transaction.
    const uniqueItemIds = [...new Set(materialRows.map((m) => parseInt(m.itemID, 10)).filter((n) => Number.isInteger(n) && n > 0))];
    for (const itemId of uniqueItemIds) {
      await new sql.Request(transaction).input('rid', sql.Int, reportID).input('iid', sql.Int, itemId)
        .query(`INSERT INTO [new_jobBooking].[partsUsed] (reportID, itemID) VALUES (@rid, @iid)`);
    }

    // Follow-up → create a Pending follow-up booking so admin + customer see it
    let followUpBookingId = null;
    if (followUpRequired && typeof body.followUpDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.followUpDate)) {
      const fuReasons = join(body.followUpReasons) || body.followUpOtherReason || 'Follow-up visit';
      const fu = await new sql.Request(transaction)
        .input('cust', sql.Int, booking.customer_ID)
        .input('tech', sql.Int, techId)
        .input('date', sql.Date, body.followUpDate)
        .input('loc', sql.VarChar(100), booking.location || 'Singapore')
        .input('comments', sql.VarChar(500),
          `Follow-up visit (${body.followUpPriority || 'Normal'} priority): ${fuReasons}`.slice(0, 500))
        .query(`
          INSERT INTO [new_jobBooking].[Booking]
            (customer_ID, technician_ID, [date], [time], isFollowup, location, [status], comments)
          OUTPUT INSERTED.booking_ID
          VALUES (@cust, @tech, @date, '09:00:00', 1, @loc, 'Pending', @comments)
        `);
      followUpBookingId = fu.recordset[0].booking_ID;

      // Preserve the source booking's service jobs and their multiplicity,
      // but allocate fresh job IDs with no report for this independent visit.
      for (const sourceJob of linkedJobs) {
        const followUpJob = await new sql.Request(transaction)
          .input('svc', sql.Int, sourceJob.serviceID)
          .query(`
            INSERT INTO [new_jobBooking].[job] (job_status, isFollowup, serviceReport, serviceID)
            OUTPUT INSERTED.job_ID
            VALUES ('Pending', 1, NULL, @svc)
          `);
        await new sql.Request(transaction)
          .input('jid', sql.Int, followUpJob.recordset[0].job_ID)
          .input('bid', sql.Int, followUpBookingId)
          .query(`INSERT INTO [new_jobBooking].[work] (job_ID, booking_ID) VALUES (@jid, @bid)`);
      }
    }

    await transaction.commit();
    transactionOpen = false;
    console.log(`[Cool Fix] Report #${reportID} saved for booking #${bookingId}` +
      (followUpBookingId ? ` (follow-up booking #${followUpBookingId} created)` : '') + '.');
    return res.status(201).json({ success: true, message: 'Service report submitted!', reportID, followUpBookingId });
  } catch (err) {
    if (transactionOpen) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('[Cool Fix] Submit Report rollback failed:', rollbackError.message);
      }
    }
    console.error('[Cool Fix] Submit Report Error:', err.message);
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAssignedJobs,
  getTechnicianStats,
  updateJobStatus,
  getTechnicianProfile,
  submitReport,
};
