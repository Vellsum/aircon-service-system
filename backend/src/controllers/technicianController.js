
/**
 * Cool Fix - Technician Controller
 * Supabase / PostgreSQL version
 *
 * Database: Supabase PostgreSQL
 * Connection: ../config/supabaseDb
 *
 * Preserved features:
 * 1. Get assigned technician jobs
 * 2. Get technician job statistics
 * 3. Update booking status
 * 4. Start-time gate
 * 5. Sequence gate
 * 6. Service-report completion gate
 * 7. Get technician profile and customer ratings
 * 8. Submit service report
 * 9. Attach report to all linked jobs
 * 10. Record materials used
 * 11. Create follow-up bookings
 */

const pool = require('../config/supabaseDb');

// Set false if time-strictness is too harsh for demos.
const ENFORCE_START_TIME = true;

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

// Local date/time using the backend server timezone.
function localDateStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localTimeStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');

  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Format "HH:MM:SS" into "2:00 PM".
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

// Handles 1006, "1006", and "#BK1006".
function parseBookingId(value) {
  if (value === null || value === undefined) return NaN;

  const m = String(value).match(/(\d+)/);

  return m ? Number(m[1]) : NaN;
}

// Convert PostgreSQL integer values safely for validation.
function isPositiveSafeInteger(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0;
}

// PostgreSQL transaction rollback helper.
async function rollbackTransaction(client, transactionOpen) {
  if (!transactionOpen) return;

  try {
    await client.query('ROLLBACK');
  } catch (err) {
    console.error('[Cool Fix] Transaction rollback failed:', err.message);
  }
}

/* ---------------------------------------------------------------------------
 * GET /api/technician/jobs
 * Returns formatted jobs and technician information.
 * ------------------------------------------------------------------------- */

const getAssignedJobs = async (req, res) => {
  try {
    const techId = parseInt(req.query.techId, 10) || 1;

    // 1. Fetch technician name.
    const techResult = await pool.query(
      `
        SELECT
          "technician_ID",
          technician_name
        FROM "user3"."technician"
        WHERE "technician_ID" = $1
      `,
      [techId]
    );

    const techName =
      techResult.rows[0]?.technician_name || 'Technician';

    // 2. Fetch assigned bookings.
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

        COALESCE(b."isFollowup", FALSE) AS "isFollowup",

        COALESCE(c.customer_name, 'Guest Customer') AS customer_name,
        COALESCE(c.customer_address, b.location) AS address,

        (
          SELECT COALESCE(
            json_agg(
              to_jsonb(service_row)
              ORDER BY service_row."serviceID", service_row."serviceName"
            ),
            '[]'::json
          )::text
          FROM (
            SELECT DISTINCT
              j."serviceID",
              s.service_name AS "serviceName"
            FROM "new_jobBooking"."work" w
            INNER JOIN "new_jobBooking"."job" j
              ON j."job_ID" = w."job_ID"
            LEFT JOIN "payables".service s
              ON s.service_id = j."serviceID"
            WHERE w."booking_ID" = b."booking_ID"
          ) AS service_row
        ) AS "servicesJson"

      FROM "new_jobBooking"."Booking" b

      LEFT JOIN "user3"."newCustomer" c
        ON b."customer_ID" = c."customer_ID"

      WHERE b."technician_ID" = $1

      ORDER BY b."date" ASC, b."time" ASC
    `;

    const result = await pool.query(query, [techId]);

    // Use local date rather than UTC.
    const todayStr = localDateStr();

    const mappedJobs = result.rows.map((row) => {
      // Date formatting.
      const jobDate = row.cleanDate || todayStr;

      let formattedDate = jobDate;

      try {
        const d = new Date(`${jobDate}T00:00:00`);

        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('en-SG', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        }
      } catch {
        // Keep the raw date if formatting fails.
      }

      return {
        job_ID: row.booking_ID,
        id: `#BK${String(row.booking_ID).padStart(3, '0')}`,

        customer_ID: row.customer_ID,
        customerName: row.customer_name || 'Guest Customer',

        serviceType: 'Aircon Servicing',

        services: JSON.parse(row.servicesJson || '[]'),

        unitType: 'Wall-Mounted Split System',

        date: jobDate,
        formattedDate,

        time: formatTimeDisplay(row.rawTime),

        // Used by the frontend start gate.
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
      };
    });

    return res.status(200).json({
      success: true,
      technicianName: techName,
      jobs: mappedJobs,
    });

  } catch (err) {
    console.error(
      '[Cool Fix] GET Technician Jobs Error:',
      err.message
    );

    return res.status(500).json({
      success: false,
      message: err.message,
      jobs: [],
    });
  }
};

/* ---------------------------------------------------------------------------
 * GET /api/technician/stats
 * ------------------------------------------------------------------------- */

const getTechnicianStats = async (req, res) => {
  try {
    const techId = parseInt(req.query.techId, 10) || 1;

    const result = await pool.query(
      `
        SELECT
          COUNT(*)::INTEGER AS "totalAssigned",

          COUNT(*) FILTER (
            WHERE LOWER(status) IN ('pending', 'assigned')
          )::INTEGER AS "pendingJobs",

          COUNT(*) FILTER (
            WHERE LOWER(status) = 'completed'
          )::INTEGER AS "completedJobs"

        FROM "new_jobBooking"."Booking"

        WHERE "technician_ID" = $1
      `,
      [techId]
    );

    return res.status(200).json({
      success: true,
      stats: result.rows[0] || {},
    });

  } catch (err) {
    console.error(
      '[Cool Fix] GET Technician Stats Error:',
      err.message
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ---------------------------------------------------------------------------
 * PUT /api/technician/jobs/:bookingId/status
 *
 * Business rules:
 *
 * A. START GATE:
 *    Cannot start before the booking date/time.
 *
 * B. SEQUENCE GATE:
 *    Can only complete a booking currently In Progress.
 *
 * C. REPORT GATE:
 *    Cannot complete without a linked service report.
 *
 * All status checks and updates run inside one transaction.
 * ------------------------------------------------------------------------- */

const updateJobStatus = async (req, res) => {
  const bookingId = parseBookingId(req.params.bookingId);
  const { status, comments } = req.body || {};

  let client;
  let transactionOpen = false;

  try {
    if (!isPositiveSafeInteger(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID.',
      });
    }

    const newStatus = String(status || '').trim();

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'A status is required.',
      });
    }

    client = await pool.connect();

    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    transactionOpen = true;

    /* -----------------------------------------------------------------------
     * Lock booking before checking or changing its status.
     * --------------------------------------------------------------------- */

    const bookingResult = await client.query(
      `
        SELECT
          "booking_ID",
          status,
          TO_CHAR("date", 'YYYY-MM-DD') AS booking_date,
          TO_CHAR("time", 'HH24:MI') AS booking_time

        FROM "new_jobBooking"."Booking"

        WHERE "booking_ID" = $1

        FOR UPDATE
      `,
      [bookingId]
    );

    const booking = bookingResult.rows[0];

    if (!booking) {
      const err = new Error('Booking not found.');
      err.statusCode = 404;
      throw err;
    }

    /* -----------------------------------------------------------------------
     * (A) START GATE
     * --------------------------------------------------------------------- */

    if (newStatus.toLowerCase() === 'in progress') {
      const today = localDateStr();
      const nowTime = localTimeStr();

      if (booking.booking_date > today) {
        throw Object.assign(
          new Error(
            `This job is scheduled for ${booking.booking_date} — it cannot be started before its booking date.`
          ),
          { statusCode: 400 }
        );
      }

      if (
        ENFORCE_START_TIME &&
        booking.booking_date === today &&
        booking.booking_time > nowTime
      ) {
        throw Object.assign(
          new Error(
            `This job is scheduled for today at ${booking.booking_time} — starting unlocks at that time.`
          ),
          { statusCode: 400 }
        );
      }

      /* ---------------------------------------------------------------------
       * Validate independent job links before starting.
       * ------------------------------------------------------------------- */

      const startLinks = await client.query(
        `
          SELECT
            j."job_ID",

            (
              SELECT COUNT(*)::INTEGER
              FROM "new_jobBooking"."work" otherWork
              WHERE otherWork."job_ID" = w."job_ID"
                AND otherWork."booking_ID" <> $1
            ) AS "otherBookingCount"

          FROM "new_jobBooking"."work" w

          INNER JOIN "new_jobBooking"."job" j
            ON j."job_ID" = w."job_ID"

          WHERE w."booking_ID" = $1

          ORDER BY j."job_ID"

          FOR UPDATE OF w, j
        `,
        [bookingId]
      );

      const linkedJobs = startLinks.rows;

      if (
        !linkedJobs.length ||
        linkedJobs.some(
          (job) =>
            !isPositiveSafeInteger(job.job_ID) ||
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

      // Mark all linked service jobs as In Progress.
      await client.query(
        `
          UPDATE "new_jobBooking"."job" j

          SET job_status = 'In Progress'

          FROM "new_jobBooking"."work" w

          WHERE w."job_ID" = j."job_ID"
            AND w."booking_ID" = $1
        `,
        [bookingId]
      );

      console.log(
        `[Cool Fix] START GATE passed for booking #${bookingId}.`
      );
    }

    /* -----------------------------------------------------------------------
     * (B) SEQUENCE GATE
     * --------------------------------------------------------------------- */

    if (newStatus.toLowerCase() === 'completed') {
      const currentStatus = String(booking.status || '').toLowerCase();

      if (currentStatus !== 'in progress') {
        throw Object.assign(
          new Error(
            `This job hasn't been started yet (status: ${currentStatus || 'unknown'}). Start it on its booking date, submit the report, then complete.`
          ),
          { statusCode: 400 }
        );
      }

      /* ---------------------------------------------------------------------
       * (C) REPORT GATE
       * ------------------------------------------------------------------- */

      const check = await client.query(
        `
          SELECT sr."reportID"

          FROM "new_jobBooking"."work" w

          INNER JOIN "new_jobBooking"."job" j
            ON j."job_ID" = w."job_ID"

          INNER JOIN "new_jobBooking"."serviceReport" sr
            ON sr."reportID" = j."serviceReport"

          WHERE w."booking_ID" = $1

          ORDER BY sr."reportID"

          LIMIT 1
        `,
        [bookingId]
      );

      if (check.rows.length === 0) {
        throw Object.assign(
          new Error(
            'A service report must be submitted BEFORE completing this job. Submit the report first, then mark it completed.'
          ),
          { statusCode: 400 }
        );
      }

      // Mark linked service jobs as Finished.
      await client.query(
        `
          UPDATE "new_jobBooking"."job" j

          SET job_status = 'Finished'

          FROM "new_jobBooking"."work" w

          WHERE w."job_ID" = j."job_ID"
            AND w."booking_ID" = $1
        `,
        [bookingId]
      );

      console.log(
        `[Cool Fix] REPORT GATE passed for booking #${bookingId} (report #${check.rows[0].reportID}).`
      );
    }

    /* -----------------------------------------------------------------------
     * Update the booking itself.
     * --------------------------------------------------------------------- */

    await client.query(
      `
        UPDATE "new_jobBooking"."Booking"

        SET
          status = COALESCE($1, status),
          comments = COALESCE($2, comments)

        WHERE "booking_ID" = $3
      `,
      [
        newStatus || null,
        comments || null,
        bookingId,
      ]
    );

    await client.query('COMMIT');
    transactionOpen = false;

    console.log(
      `[Cool Fix] Booking #${bookingId} status set to '${newStatus}'.`
    );

    return res.status(200).json({
      success: true,
      message: 'Status updated successfully!',
    });

  } catch (err) {
    await rollbackTransaction(client, transactionOpen);

    console.error(
      '[Cool Fix] PUT Technician Status Error:',
      err.message
    );

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });

  } finally {
    if (client) client.release();
  }
};

/* ---------------------------------------------------------------------------
 * GET /api/technician/profile
 * Returns technician profile information and customer ratings.
 * ------------------------------------------------------------------------- */

const getTechnicianProfile = async (req, res) => {
  try {
    const techId = parseInt(req.query.techId, 10) || 1;

    const result = await pool.query(
      `
        SELECT
          t."technician_ID",
          t.technician_name,
          t.technician_rating,
          t.specialty,
          t."jobsDone",

          ratings."customerRatingAverage",
          ratings."customerReviewCount",

          ratings.star1,
          ratings.star2,
          ratings.star3,
          ratings.star4,
          ratings.star5

        FROM "user3"."technician" t

        LEFT JOIN LATERAL (
          SELECT
            AVG(r.stars::DECIMAL(10, 4)) AS "customerRatingAverage",

            COUNT(*)::INTEGER AS "customerReviewCount",

            COUNT(*) FILTER (WHERE r.stars = 1)::INTEGER AS star1,
            COUNT(*) FILTER (WHERE r.stars = 2)::INTEGER AS star2,
            COUNT(*) FILTER (WHERE r.stars = 3)::INTEGER AS star3,
            COUNT(*) FILTER (WHERE r.stars = 4)::INTEGER AS star4,
            COUNT(*) FILTER (WHERE r.stars = 5)::INTEGER AS star5

          FROM "new_jobBooking"."bookingRating" r

          WHERE r."technician_ID" = t."technician_ID"
            AND r.stars BETWEEN 1 AND 5
        ) ratings ON TRUE

        WHERE t."technician_ID" = $1
      `,
      [techId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found',
      });
    }

    const row = result.rows[0];

    return res.json({
      success: true,

      profile: {
        technicianID: row.technician_ID,
        technicianName: row.technician_name,

        technicianRating: row.technician_rating,

        customerRatingAverage: row.customerRatingAverage,
        customerReviewCount: row.customerReviewCount,

        customerRatingDistribution: [1, 2, 3, 4, 5].map(
          (stars) => ({
            stars,
            count: row[`star${stars}`],
          })
        ),

        specialty: row.specialty || '',
        jobsDone: row.jobsDone || 0,
      },
    });

  } catch (err) {
    console.error(
      '[Cool Fix] GET Technician Profile Error:',
      err.message
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ---------------------------------------------------------------------------
 * POST /api/technician/reports
 *
 * Expected frontend payload:
 *
 * {
 *   job_ID,
 *   findings[],
 *   findingsOther,
 *   actionsTaken[],
 *   actionsOther,
 *   overallCondition,
 *   checklistItems[],
 *   materials[],
 *   materialsTotal,
 *   followUpRequired,
 *   followUpReasons[],
 *   followUpDate,
 *   followUpPriority,
 *   completionDateTime,
 *   customerAcknowledged
 * }
 *
 * Report relationship:
 * job.serviceReport -> serviceReport.reportID
 * ------------------------------------------------------------------------- */

const submitReport = async (req, res) => {
  let client;
  let transactionOpen = false;

  try {
    const body = req.body || {};

    const bookingId = parseBookingId(body.job_ID);

    if (!isPositiveSafeInteger(bookingId)) {
      return res.status(400).json({
        success: false,
        error: 'A valid job/booking reference is required.',
      });
    }

    client = await pool.connect();

    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    transactionOpen = true;

    /* -----------------------------------------------------------------------
     * 1. Fetch and lock the booking.
     * --------------------------------------------------------------------- */

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

    /* -----------------------------------------------------------------------
     * 2. Lock and validate the booking's service job links.
     *
     * A shared job would attach this report to another booking.
     * --------------------------------------------------------------------- */

    const linked = await client.query(
      `
        SELECT
          j."job_ID",
          j."serviceID",
          j."serviceReport",

          s.service_id AS "linkedServiceID",

          (
            SELECT COUNT(*)::INTEGER
            FROM "new_jobBooking"."work" otherWork
            WHERE otherWork."job_ID" = w."job_ID"
              AND otherWork."booking_ID" <> $1
          ) AS "otherBookingCount"

        FROM "new_jobBooking"."work" w

        INNER JOIN "new_jobBooking"."job" j
          ON j."job_ID" = w."job_ID"

        LEFT JOIN "payables".service s
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
      linkedJobs.some(
        (job) =>
          !isPositiveSafeInteger(job.job_ID) ||
          !isPositiveSafeInteger(job.serviceID) ||
          Number(job.linkedServiceID) !== Number(job.serviceID) ||
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

    if (linkedJobs.some((job) => job.serviceReport != null)) {
      throw Object.assign(
        new Error(
          'Cannot save report: a service report is already linked to this booking.'
        ),
        { statusCode: 409 }
      );
    }

    /* -----------------------------------------------------------------------
     * 3. Flatten frontend arrays into report columns.
     * --------------------------------------------------------------------- */

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
    } else {
      completionVal = new Date();
    }

    /* -----------------------------------------------------------------------
     * 4. Insert service report.
     * --------------------------------------------------------------------- */

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
          $6, $7, $8, $9, $10
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
        completionVal,
      ]
    );

    const reportID = inserted.rows[0].reportID;

    /* -----------------------------------------------------------------------
     * 5. Attach the report to every service job belonging to this booking.
     * --------------------------------------------------------------------- */

    const attached = await client.query(
      `
        UPDATE "new_jobBooking"."job" j

        SET "serviceReport" = $1

        FROM "new_jobBooking"."work" w

        WHERE w."job_ID" = j."job_ID"
          AND w."booking_ID" = $2

        RETURNING j."job_ID"
      `,
      [reportID, bookingId]
    );

    const attachedJobIDs = new Set(
      attached.rows.map((job) => Number(job.job_ID))
    );

    if (
      attached.rows.length !== linkedJobs.length ||
      attachedJobIDs.size !== linkedJobs.length ||
      linkedJobs.some(
        (job) => !attachedJobIDs.has(Number(job.job_ID))
      )
    ) {
      throw new Error(
        'Service report could not be attached to all of this booking\'s service jobs.'
      );
    }

    /* -----------------------------------------------------------------------
     * 6. Insert material links.
     * --------------------------------------------------------------------- */

    const uniqueItemIds = [
      ...new Set(
        materialRows
          .map((m) => parseInt(m.itemID, 10))
          .filter((n) => Number.isInteger(n) && n > 0)
      ),
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

    /* -----------------------------------------------------------------------
     * 7. Create a follow-up booking if requested.
     * --------------------------------------------------------------------- */

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
          `Follow-up visit (${body.followUpPriority || 'Normal'} priority): ${fuReasons}`.slice(0, 500),
        ]
      );

      followUpBookingId = fu.rows[0].booking_ID;

      /* ---------------------------------------------------------------------
       * Create fresh independent jobs for the follow-up booking.
       *
       * Preserve the source booking's service jobs and their multiplicity.
       * Do not reuse the original job IDs or report links.
       * ------------------------------------------------------------------- */

      for (const sourceJob of linkedJobs) {
        const followUpJob = await client.query(
          `
            INSERT INTO "new_jobBooking"."job"
            (
              job_status,
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

        const newJobId = followUpJob.rows[0].job_ID;

        await client.query(
          `
            INSERT INTO "new_jobBooking"."work"
              ("job_ID", "booking_ID")

            VALUES ($1, $2)
          `,
          [newJobId, followUpBookingId]
        );
      }
    }

    /* -----------------------------------------------------------------------
     * 8. Commit the entire report operation.
     * --------------------------------------------------------------------- */

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
      followUpBookingId,
    });

  } catch (err) {
    await rollbackTransaction(client, transactionOpen);

    console.error(
      '[Cool Fix] Submit Report Error:',
      err.message
    );

    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
    });

  } finally {
    if (client) client.release();
  }
};

/* ---------------------------------------------------------------------------
 * Exports
 * ------------------------------------------------------------------------- */

module.exports = {
  getAssignedJobs,
  getTechnicianStats,
  updateJobStatus,
  getTechnicianProfile,
  submitReport,
};
