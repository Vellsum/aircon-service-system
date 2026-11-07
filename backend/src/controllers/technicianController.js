/**
 * Cool Fix - Technician Controller
 * Supabase PostgreSQL schemas:
 *   "new_jobBooking"
 *   "user3"
 *   "payables"
 */

const pool = require('../config/supabaseDb');

// 6 Oct 2026 — set false if time-strictness is too harsh for demos
const ENFORCE_START_TIME = true;

/* ---------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------- */

// Local date/time as strings (server timezone)
function localDateStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localTimeStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');

  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Format "HH:MM:SS" → "2:00 PM"
function formatTimeDisplay(raw, fallback = '09:00 AM') {
  if (!raw) return fallback;

  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);

  if (!m) {
    return s.includes('AM') || s.includes('PM') ? s : fallback;
  }

  const h = Number(m[1]);
  const min = m[2];

  if (isNaN(h)) return fallback;

  return `${h % 12 || 12}:${min} ${h >= 12 ? 'PM' : 'AM'}`;
}

// Extract booking ID from values such as 1006 or "#BK1006"
function parseBookingId(value) {
  if (value === null || value === undefined) return NaN;

  const m = String(value).match(/(\d+)/);

  return m ? Number(m[1]) : NaN;
}

// Safely rollback a PostgreSQL transaction
async function rollbackTransaction(client) {
  try {
    await client.query('ROLLBACK');
  } catch (err) {
    console.error('[Cool Fix] Transaction rollback failed:', err.message);
  }
}

/* ---------------------------------------------------------------------------
 * 1. GET ASSIGNED JOBS
 * GET /api/technician/jobs
 * ------------------------------------------------------------------------- */

const getAssignedJobs = async (req, res) => {
  try {
    const techId = parseInt(req.query.techId, 10) || 1;

    // 1. Fetch Technician Name
    const techResult = await pool.query(
      `
        SELECT
          "technician_ID",
          "technician_name"
        FROM "user3"."technician"
        WHERE "technician_ID" = $1
      `,
      [techId]
    );

    const techName =
      techResult.rows[0]?.technician_name || 'Technician';

    // 2. Fetch Assigned Bookings
    const query = `
      SELECT
        b."booking_ID",
        b."customer_ID",
        b."technician_ID",

        TO_CHAR(b."date", 'YYYY-MM-DD') AS "cleanDate",
        TO_CHAR(b."time", 'HH24:MI:SS') AS "rawTime",

        b.location,
        b.status,
        b.comments,
        b."servicesBooked",

        COALESCE(b."isFollowup", FALSE) AS "isFollowup",

        COALESCE(c.customer_name, 'Guest Customer') AS customer_name,
        COALESCE(c.customer_address, b.location) AS address

      FROM "new_jobBooking"."Booking" AS b

      LEFT JOIN "user3"."newCustomer" AS c
        ON b."customer_ID" = c."customer_ID"

      WHERE b."technician_ID" = $1

      ORDER BY b."date" ASC, b."time" ASC
    `;

    const result = await pool.query(query, [techId]);

    const todayStr = localDateStr();

    const mappedJobs = (result.rows || []).map((row) => {
      // Date formatting
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
      } catch {
        // Keep raw date
      }

      return {
        job_ID: row.booking_ID,
        id: `#BK${String(row.booking_ID).padStart(3, '0')}`,

        customer_ID: row.customer_ID,
        customerName: row.customer_name || 'Guest Customer',

        serviceType: 'Aircon Servicing',
        unitType: 'Wall-Mounted Split System',

        date: jobDate,
        formattedDate,

        time: formatTimeDisplay(row.rawTime),
        time24: String(row.rawTime || '09:00:00').slice(0, 5),

        estimatedDuration: '60 mins',

        timeframe:
          jobDate === todayStr || !row.cleanDate
            ? 'today'
            : 'this-week',

        status: row.status || 'Pending',

        address: row.address || 'Singapore',
        postalCode: '512345',

        isFollowup: Boolean(row.isFollowup),

        notes: row.comments || 'No special instructions.',
        servicesBooked: row.servicesBooked,
      };
    });

    return res.status(200).json({
      success: true,
      technicianName: techName,
      jobs: mappedJobs,
    });

  } catch (err) {
    console.error('[Cool Fix] GET Technician Jobs Error:', err.message);

    res.status(500).json({
      success: false,
      message: err.message,
      jobs: []
    });
  }
};

/* ---------------------------------------------------------------------------
 * 2. GET TECHNICIAN STATS
 * GET /api/technician/stats
 * ------------------------------------------------------------------------- */

const getTechnicianStats = async (req, res) => {
  try {
    const techId = parseInt(req.query.techId, 10) || 1;

    const result = await pool.query(
      `
        SELECT
          COUNT(*) AS "totalAssigned",

          COUNT(*) FILTER (
            WHERE LOWER("status") IN ('pending', 'assigned')
          ) AS "pendingJobs",

          COUNT(*) FILTER (
            WHERE LOWER("status") = 'completed'
          ) AS "completedJobs"

        FROM "new_jobBooking"."Booking"

        WHERE "technician_ID" = $1
      `,
      [techId]
    );

    return res.status(200).json({
      success: true,
      stats: result.rows[0] || {}
    });

  } catch (err) {
    console.error('[Cool Fix] GET Technician Stats Error:', err.message);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* ---------------------------------------------------------------------------
 * 3. UPDATE JOB STATUS
 * PUT /api/technician/jobs/:bookingId/status
 *
 * Rules:
 *   A. START GATE    — cannot start before booking date/time
 *   B. SEQUENCE GATE — cannot complete unless In Progress
 *   C. REPORT GATE   — cannot complete without a service report
 * ------------------------------------------------------------------------- */

const updateJobStatus = async (req, res) => {
  let client;
  let transactionOpen = false;

  try {
    const { bookingId } = req.params;
    const { status, comments } = req.body;

    const newStatus = String(status || '').trim();
    const normalizedStatus = newStatus.toLowerCase();

    const numericBookingId = Number(bookingId);

    if (!Number.isInteger(numericBookingId) || numericBookingId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID.'
      });
    }

    // -----------------------------------------------------------------------
    // A. START GATE
    // -----------------------------------------------------------------------

    if (normalizedStatus === 'in progress') {
      const b = await pool.query(
        `
          SELECT
            TO_CHAR("date", 'YYYY-MM-DD') AS d,
            TO_CHAR("time", 'HH24:MI') AS t

          FROM "new_jobBooking"."Booking"

          WHERE "booking_ID" = $1
        `,
        [numericBookingId]
      );

      const row = b.rows[0];

      if (!row) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      const today = localDateStr();
      const nowTime = localTimeStr();

      if (row.d > today) {
        console.error(
          `[Cool Fix] START GATE rejected booking #${bookingId}: scheduled for ${row.d}.`
        );

        return res.status(400).json({
          success: false,
          message: `This job is scheduled for ${row.d} — it cannot be started before its booking date.`
        });
      }

      if (
        ENFORCE_START_TIME &&
        row.d === today &&
        row.t > nowTime
      ) {
        console.error(
          `[Cool Fix] START GATE rejected booking #${bookingId}: scheduled for today at ${row.t}.`
        );

        return res.status(400).json({
          success: false,
          message: `This job is scheduled for today at ${row.t} — starting unlocks at that time.`
        });
      }
    }

    // -----------------------------------------------------------------------
    // B. SEQUENCE GATE
    // -----------------------------------------------------------------------

    if (normalizedStatus === 'completed') {
      const cur = await pool.query(
        `
          SELECT LOWER("status") AS s

          FROM "new_jobBooking"."Booking"

          WHERE "booking_ID" = $1
        `,
        [numericBookingId]
      );

      const s = cur.rows[0]?.s;

      if (s !== 'in progress') {
        console.error(
          `[Cool Fix] SEQUENCE GATE rejected booking #${bookingId}: status '${s || 'unknown'}', not In Progress.`
        );

        return res.status(400).json({
          success: false,
          message: `This job hasn't been started yet (status: ${s || 'unknown'}). Start it on its booking date, submit the report, then complete.`
        });
      }
    }

    // -----------------------------------------------------------------------
    // C. REPORT GATE
    // -----------------------------------------------------------------------

    if (normalizedStatus === 'completed') {
      const check = await pool.query(
        `
          SELECT sr."reportID"

          FROM "new_jobBooking"."serviceReport" AS sr

          WHERE sr."reportID" IN (
            SELECT j."serviceReport"

            FROM "new_jobBooking"."work" AS w

            JOIN "new_jobBooking"."job" AS j
              ON j."job_ID" = w."job_ID"

            WHERE w."booking_ID" = $1
              AND j."serviceReport" IS NOT NULL
          )

          LIMIT 1
        `,
        [numericBookingId]
      );

      if (check.rows.length === 0) {
        console.error(
          `[Cool Fix] REPORT GATE rejected booking #${bookingId}: no report found.`
        );

        return res.status(400).json({
          success: false,
          message: 'A service report must be submitted BEFORE completing this job. Submit the report first, then mark it completed.'
        });
      }

      console.log(
        `[Cool Fix] REPORT GATE passed for booking #${bookingId} (report #${check.rows[0].reportID}).`
      );
    }

    // -----------------------------------------------------------------------
    // TRANSACTION
    // -----------------------------------------------------------------------

    client = await pool.connect();

    await client.query('BEGIN');
    transactionOpen = true;

    // Lock booking row before updating it
    const lockedBooking = await client.query(
      `
        SELECT "booking_ID"

        FROM "new_jobBooking"."Booking"

        WHERE "booking_ID" = $1

        FOR UPDATE
      `,
      [numericBookingId]
    );

    if (lockedBooking.rows.length === 0) {
      throw Object.assign(
        new Error('Booking not found'),
        { statusCode: 404 }
      );
    }

    // -----------------------------------------------------------------------
    // START JOB
    // -----------------------------------------------------------------------

    if (normalizedStatus === 'in progress') {
      const startLinks = await client.query(
        `
          SELECT
            j."job_ID",

            (
              SELECT COUNT(*)::int

              FROM "new_jobBooking"."work" AS otherWork

              WHERE otherWork."job_ID" = w."job_ID"
                AND otherWork."booking_ID" <> $1

            ) AS "otherBookingCount"

          FROM "new_jobBooking"."work" AS w

          JOIN "new_jobBooking"."job" AS j
            ON j."job_ID" = w."job_ID"

          WHERE w."booking_ID" = $1

          ORDER BY j."job_ID"

          FOR UPDATE OF w, j
        `,
        [numericBookingId]
      );

      if (
        !startLinks.rows.length ||
        startLinks.rows.some((job) =>
          !Number.isSafeInteger(job.job_ID) ||
          job.job_ID <= 0 ||
          Number(job.otherBookingCount) !== 0
        )
      ) {
        throw Object.assign(
          new Error(
            'Cannot start service: this booking requires valid, independent service job links.'
          ),
          { statusCode: 400 }
        );
      }

      // Update linked jobs to In Progress
      await client.query(
        `
          UPDATE "new_jobBooking"."job" AS j

          SET "job_status" = 'In Progress'

          FROM "new_jobBooking"."work" AS w

          WHERE w."job_ID" = j."job_ID"
            AND w."booking_ID" = $1
        `,
        [numericBookingId]
      );
    }

    // -----------------------------------------------------------------------
    // COMPLETE JOB
    // -----------------------------------------------------------------------

    if (normalizedStatus === 'completed') {
      await client.query(
        `
          UPDATE "new_jobBooking"."job" AS j

          SET "job_status" = 'Finished'

          FROM "new_jobBooking"."work" AS w

          WHERE w."job_ID" = j."job_ID"
            AND w."booking_ID" = $1
        `,
        [numericBookingId]
      );
    }

    // -----------------------------------------------------------------------
    // UPDATE BOOKING STATUS
    // -----------------------------------------------------------------------

    await client.query(
      `
        UPDATE "new_jobBooking"."Booking"

        SET
          "status" = COALESCE($1, "status"),
          "comments" = COALESCE($2, "comments")

        WHERE "booking_ID" = $3
      `,
      [
        newStatus || null,
        comments || null,
        numericBookingId
      ]
    );

    await client.query('COMMIT');
    transactionOpen = false;

    console.log(
      `[Cool Fix] Booking #${bookingId} status set to '${newStatus}'.`
    );

    res.status(200).json({
      success: true,
      message: 'Status updated successfully!'
    });

  } catch (err) {
    if (transactionOpen && client) {
      await rollbackTransaction(client);
    }

    console.error('[Cool Fix] PUT Technician Status Error:', err.message);

    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};

/* ---------------------------------------------------------------------------
 * 4. GET TECHNICIAN PROFILE
 * GET /api/technician/profile
 * ------------------------------------------------------------------------- */

const getTechnicianProfile = async (req, res) => {
  try {
    const techId = parseInt(req.query.techId, 10) || 1;

    const result = await pool.query(
      `
        SELECT
          t."technician_ID",
          t."technician_name",
          t.technician_rating,
          t.specialty,
          t."jobsDone",

          ratings."customerRatingAverage",
          ratings."customerReviewCount"

        FROM "user3"."technician" AS t

        LEFT JOIN LATERAL (
          SELECT
            AVG(r.stars::DECIMAL(10, 4)) AS "customerRatingAverage",
            COUNT(*) AS "customerReviewCount"

          FROM "new_jobBooking"."bookingRating" AS r

          WHERE r."technician_ID" = t."technician_ID"
            AND r.stars BETWEEN 1 AND 5

        ) AS ratings ON TRUE

        WHERE t."technician_ID" = $1
      `,
      [techId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    const row = result.rows[0];

    res.json({
      success: true,

      profile: {
        technicianID: row.technician_ID,
        technicianName: row.technician_name,
        technicianRating: row.technician_rating,

        customerRatingAverage: row.customerRatingAverage,
        customerReviewCount: row.customerReviewCount,

        specialty: row.specialty || '',
        jobsDone: row.jobsDone || 0,
      },
    });

  } catch (err) {
    console.error('[Cool Fix] GET Technician Profile Error:', err.message);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* ---------------------------------------------------------------------------
 * 5. SUBMIT SERVICE REPORT
 * POST /api/technician/reports
 *
 * Contract = TechnicianSubmitReport.jsx buildReportPayload():
 *   {
 *     job_ID,
 *     findings[],
 *     findingsOther,
 *     actionsTaken[],
 *     actionsOther,
 *     overallCondition,
 *     checklistItems[],
 *     materials[],
 *     materialsTotal,
 *     followUpRequired,
 *     followUpReasons[],
 *     followUpDate,
 *     followUpPriority,
 *     completionDateTime,
 *     customerAcknowledged
 *   }
 * ------------------------------------------------------------------------- */

const submitReport = async (req, res) => {
  let client;
  let transactionOpen = false;

  try {
    const body = req.body || {};

    const bookingId = parseBookingId(body.job_ID);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'A valid job/booking reference is required.'
      });
    }

    client = await pool.connect();

    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    transactionOpen = true;

    // -----------------------------------------------------------------------
    // 1. LOCK AND FETCH BOOKING
    // -----------------------------------------------------------------------

    const b = await client.query(
      `
        SELECT
          "booking_ID",
          "customer_ID",
          "technician_ID",
          location

        FROM "new_jobBooking"."Booking"

        WHERE "booking_ID" = $1

        FOR UPDATE
      `,
      [bookingId]
    );

    const booking = b.rows[0];

    if (!booking) {
      throw Object.assign(
        new Error(`Booking #${bookingId} not found.`),
        { statusCode: 404 }
      );
    }

    const techId =
      Number(booking.technician_ID) ||
      parseInt(req.query.techId, 10) ||
      parseInt(body.technicianID, 10);

    if (!techId) {
      throw Object.assign(
        new Error(
          'Cannot save report: no technician assigned to this booking yet.'
        ),
        { statusCode: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 2. LOCK SERVICE JOB LINKS
    // -----------------------------------------------------------------------
const linked = await client.query(
  `
    SELECT
      j."job_ID",
      j."serviceID",
      j."serviceReport",

      s.service_id AS "linkedServiceID",

      (
        SELECT COUNT(*)::int

        FROM "new_jobBooking"."work" AS otherWork

        WHERE otherWork."job_ID" = w."job_ID"
          AND otherWork."booking_ID" <> $1

      ) AS "otherBookingCount"

    FROM "new_jobBooking"."work" AS w

    JOIN "new_jobBooking"."job" AS j
      ON j."job_ID" = w."job_ID"

    LEFT JOIN "payables".service AS s
      ON s.service_id = j."serviceID"

    WHERE w."booking_ID" = $1

    ORDER BY j."job_ID"

    FOR UPDATE OF w, j
  `,
  [bookingId]
);

const linkedJobs = linked.rows;

if (
  !linkedJobs.length ||
  linkedJobs.some((job) =>
    !Number.isSafeInteger(job.job_ID) ||
    job.job_ID <= 0 ||
    !Number.isSafeInteger(job.serviceID) ||
    job.serviceID <= 0 ||
    Number(job.linkedServiceID) !== job.serviceID ||
    Number(job.otherBookingCount) !== 0
  )
) {
  throw Object.assign(
    new Error(
      'Cannot save report: this booking requires valid, independent service job links.'
    ),
    { statusCode: 400 }
  );
}

    // -----------------------------------------------------------------------
    // 3. PREPARE REPORT DATA
    // -----------------------------------------------------------------------

    const arr = (v) =>
      Array.isArray(v)
        ? v.filter((x) => String(x || '').trim())
        : [];

    const join = (v) => arr(v).join('; ');

    let findingsText = join(body.findings);

    if (body.findingsOther) {
      findingsText =
        (findingsText ? findingsText + '; ' : '') +
        String(body.findingsOther);
    }

    let actionsText = join(body.actionsTaken);

    if (body.actionsOther) {
      actionsText =
        (actionsText ? actionsText + '; ' : '') +
        String(body.actionsOther);
    }

    const checklistText = arr(body.checklistItems).join(', ');

    const followUpRequired =
      body.followUpRequired === true ||
      body.followUpRequired === 'true' ||
      body.followUpRequired === 1;

    let recommendationsText = '';

    if (followUpRequired) {
      const reasons = join(body.followUpReasons);

      recommendationsText =
        `Follow-up required (${body.followUpPriority || 'Normal'} priority)` +
        (reasons ? ` — ${reasons}` : '') +
        (body.followUpDate
          ? ` — recommended date ${body.followUpDate}`
          : '');
    }

    const materialRows = arr(body.materials);

    const notesText = [
      materialRows.length
        ? `Materials: ${materialRows.length} line(s), total SGD ${Number(body.materialsTotal || 0).toFixed(2)}`
        : null,

      body.customerAcknowledged
        ? 'Customer acknowledged the completed work.'
        : 'Customer acknowledgement not recorded.',
    ]
      .filter(Boolean)
      .join('. ');

    const descriptionText =
      `Service report for booking #${bookingId}` +
      (booking.location ? ` — ${booking.location}` : '');

    let completionVal = null;

    if (
      typeof body.completionDateTime === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(body.completionDateTime)
    ) {
      completionVal = body.completionDateTime.slice(0, 19).replace('T', ' ');
    }

    // -----------------------------------------------------------------------
    // 4. INSERT SERVICE REPORT
    // -----------------------------------------------------------------------

    const inserted = await client.query(
      `
        INSERT INTO "new_jobBooking"."serviceReport"
        (
          description,
          "technicianID",
          "isFollowup",
          findings,
          "actionsTaken",
          "AC_condition",
          recommendations,
          notes,
          "serviceChecklist",
          "completedDateTime"
        )

        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          COALESCE($10::TIMESTAMP, CURRENT_TIMESTAMP)
        )

        RETURNING "reportID"
      `,
      [
        descriptionText.slice(0, 500),
        techId,
        followUpRequired,
        findingsText || null,
        actionsText || null,
        body.overallCondition || null,
        recommendationsText || null,
        notesText || null,
        checklistText || null,
        completionVal
      ]
    );

    const reportID = inserted.rows[0].reportID;

    // -----------------------------------------------------------------------
    // 5. ATTACH REPORT TO ALL SERVICE JOBS
    // -----------------------------------------------------------------------

    const attached = await client.query(
      `
        UPDATE "new_jobBooking"."job" AS j

        SET "serviceReport" = $1

        FROM "new_jobBooking"."work" AS w

        WHERE w."job_ID" = j."job_ID"
          AND w."booking_ID" = $2

        RETURNING j."job_ID"
      `,
      [reportID, bookingId]
    );

    const attachedJobIDs = new Set(
      attached.rows.map((job) => job.job_ID)
    );

    if (
      attached.rows.length !== linkedJobs.length ||
      attachedJobIDs.size !== linkedJobs.length ||
      linkedJobs.some((job) => !attachedJobIDs.has(job.job_ID))
    ) {
      throw new Error(
        'Service report could not be attached to all of this booking\'s service jobs.'
      );
    }

    // -----------------------------------------------------------------------
    // 6. INSERT MATERIAL LINKS
    // -----------------------------------------------------------------------

    const uniqueItemIds = [
      ...new Set(
        materialRows
          .map((m) => parseInt(m.itemID, 10))
          .filter((n) => Number.isInteger(n) && n > 0)
      )
    ];

    for (const itemId of uniqueItemIds) {
      await client.query(
        `
          INSERT INTO "new_jobBooking"."partsUsed"
            ("reportID", "itemID")

          VALUES ($1, $2)
        `,
        [reportID, itemId]
      );
    }

    // -----------------------------------------------------------------------
    // 7. CREATE FOLLOW-UP BOOKING IF REQUIRED
    // -----------------------------------------------------------------------

    let followUpBookingId = null;

    if (
      followUpRequired &&
      typeof body.followUpDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.followUpDate)
    ) {
      const fuReasons =
        join(body.followUpReasons) ||
        body.followUpOtherReason ||
        'Follow-up visit';

      const fu = await client.query(
        `
          INSERT INTO "new_jobBooking"."Booking"
          (
            "customer_ID",
            "technician_ID",
            "date",
            "time",
            "isFollowup",
            location,
            status,
            comments
          )

          VALUES (
            $1,
            $2,
            $3::DATE,
            '09:00:00'::TIME,
            TRUE,
            $4,
            'Pending',
            $5
          )

          RETURNING "booking_ID"
        `,
        [
          booking.customer_ID,
          techId,
          body.followUpDate,
          booking.location || 'Singapore',
          `Follow-up visit (${body.followUpPriority || 'Normal'} priority): ${fuReasons}`.slice(0, 500)
        ]
      );

      followUpBookingId = fu.rows[0].booking_ID;

      // Create fresh service jobs for the follow-up booking
      for (const sourceJob of linkedJobs) {
        const followUpJob = await client.query(
          `
            INSERT INTO "new_jobBooking"."job"
            (
              "job_status",
              "isFollowup",
              "serviceReport",
              "serviceID"
            )

            VALUES (
              'Pending',
              TRUE,
              NULL,
              $1
            )

            RETURNING "job_ID"
          `,
          [sourceJob.serviceID]
        );

        await client.query(
          `
            INSERT INTO "new_jobBooking"."work"
              ("job_ID", "booking_ID")

            VALUES ($1, $2)
          `,
          [
            followUpJob.rows[0].job_ID,
            followUpBookingId
          ]
        );
      }
    }

    // -----------------------------------------------------------------------
    // 8. COMMIT
    // -----------------------------------------------------------------------

    await client.query('COMMIT');
    transactionOpen = false;

    console.log(
      `[Cool Fix] Report #${reportID} saved for booking #${bookingId}` +
      (followUpBookingId
        ? ` (follow-up booking #${followUpBookingId} created)`
        : '') +
      '.'
    );

    return res.status(201).json({
      success: true,
      message: 'Service report submitted!',
      reportID,
      followUpBookingId
    });

  } catch (err) {
    if (transactionOpen && client) {
      await rollbackTransaction(client);
    }

    console.error('[Cool Fix] Submit Report Error:', err.message);

    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getAssignedJobs,
  getTechnicianStats,
  updateJobStatus,
  getTechnicianProfile,
  submitReport,
};