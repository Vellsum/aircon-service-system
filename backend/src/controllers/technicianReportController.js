
const pool = require('../config/supabaseDb');

const REPORT_TABLE = '"new_jobBooking"."serviceReport"';

// =============================================================================
// HELPERS
// =============================================================================

function truncate(str, maxLen) {
  if (!str) return null;

  str = String(str);

  return str.length > maxLen
    ? str.substring(0, maxLen - 3) + '...'
    : str;
}

function arrayToCsv(arr, maxLen) {
  if (!Array.isArray(arr) || arr.length === 0) return null;

  return truncate(arr.join(', '), maxLen);
}

function getTechnicianId(req, res) {
  const techId = Number.parseInt(req.query.techId, 10);

  if (!Number.isSafeInteger(techId) || techId <= 0) {
    res.status(400).json({
      success: false,
      message: 'A valid technician ID is required.'
    });

    return null;
  }

  return techId;
}

// =============================================================================
// FOLLOW-UP AUTO-BOOKING
// =============================================================================

async function createFollowUpBooking(pool, {
  sourceBookingId,
  reasons,
  otherReason,
  followUpDate,
  priority
}) {
  const src = await pool.query(
    `SELECT "customer_ID", "technician_ID", location
     FROM "new_jobBooking"."Booking"
     WHERE "booking_ID" = $1`,
    [Number(sourceBookingId)]
  );

  const s = src.rows[0];

  if (!s || !s.technician_ID) return null;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(followUpDate || ''))
    ? String(followUpDate)
    : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const comment = `Follow-up visit${priority ? ` (${priority} priority)` : ''}: ${
    [...(reasons || []), otherReason]
      .filter(Boolean)
      .join(', ') || 'Recommended by technician'
  }`;

  const ins = await pool.query(
    `INSERT INTO "new_jobBooking"."Booking"
      ("customer_ID", "technician_ID", "date", "time",
       "isFollowup", location, status, comments)
     VALUES ($1, $2, $3, '09:00', TRUE, $4, 'Scheduled', $5)
     RETURNING "booking_ID"`,
    [
      s.customer_ID,
      s.technician_ID,
      date,
      s.location,
      comment
    ]
  );

  const newBookingId = ins.rows[0].booking_ID;

  // Create job
  const svc = await pool.query(
    `SELECT service_id
     FROM "payables".service
     ORDER BY service_id
     LIMIT 1`
  );

  if (!svc.rows[0]) {
    throw new Error('No service found for follow-up booking.');
  }

  const j = await pool.query(
    `INSERT INTO "new_jobBooking".job
      (job_status, "isFollowup", "serviceID")
     VALUES ('Pending', TRUE, $1)
     RETURNING "job_ID"`,
    [svc.rows[0].service_id]
  );

  // Link job to booking
  await pool.query(
    `INSERT INTO "new_jobBooking".work
      ("job_ID", "booking_ID")
     VALUES ($1, $2)`,
    [j.rows[0].job_ID, newBookingId]
  );

  return newBookingId;
}

// =============================================================================
// SUBMIT SERVICE REPORT
// =============================================================================

const submitReport = async (req, res) => {
  try {
    const job_ID = Number.parseInt(req.body.job_ID, 10);

    const {
      findings,
      findingsOther,
      actionsTaken,
      actionsOther,
      overallCondition,
      checklistItems,
      materials,
      materialsTotal,
      followUpRequired,
      followUpReasons,
      followUpOtherReason,
      followUpDate,
      followUpPriority,
      completionDateTime,
      customerAcknowledged,
      internalNotes
    } = req.body;

    if (!Number.isSafeInteger(job_ID) || job_ID <= 0) {
      return res.status(400).json({ error: 'Valid job_ID is required' });
    }

    if (!overallCondition) {
      return res.status(400).json({ error: 'overallCondition is required' });
    }

    if (!Array.isArray(findings) || findings.length === 0) {
      return res.status(400).json({
        error: 'At least one finding is required'
      });
    }

    if (!Array.isArray(actionsTaken) || actionsTaken.length === 0) {
      return res.status(400).json({
        error: 'At least one action is required'
      });
    }

    const descParts = [];

    if (findings.length > 0) descParts.push(findings[0]);
    if (actionsTaken.length > 0) descParts.push(actionsTaken[0]);

    const description =
      truncate(descParts.join(' + '), 100) || 'Service report';

    // The submitted job_ID is used as the booking ID in this existing workflow.
    const techResult = await pool.query(
      `SELECT "technician_ID"
       FROM "new_jobBooking"."Booking"
       WHERE "booking_ID" = $1`,
      [job_ID]
    );

    if (techResult.rows.length === 0) {
      return res.status(400).json({ error: 'Booking not found' });
    }

    const technicianID = techResult.rows[0].technician_ID;

    const findingsArr = findings.slice();

    if (findingsOther && findingsOther.trim()) {
      findingsArr.push(findingsOther.trim());
    }

    const findingsStr = arrayToCsv(findingsArr, 200);

    const actionsArr = actionsTaken.slice();

    if (actionsOther && actionsOther.trim()) {
      actionsArr.push(actionsOther.trim());
    }

    const actionsStr = arrayToCsv(actionsArr, 200);

    let recommendationsStr = null;

    if (
      followUpRequired &&
      Array.isArray(followUpReasons) &&
      followUpReasons.length > 0
    ) {
      const recParts = [];

      recParts.push(followUpReasons.join(', '));

      if (followUpOtherReason) {
        recParts.push(followUpOtherReason);
      }

      if (followUpPriority) {
        recParts.push('Priority: ' + followUpPriority);
      }

      if (followUpDate) {
        recParts.push('By: ' + followUpDate);
      }

      recommendationsStr = truncate(recParts.join(' | '), 200);
    }

    const checklistStr = arrayToCsv(checklistItems, 200);

    const completedStr = completionDateTime
      ? truncate(new Date(completionDateTime).toISOString(), 100)
      : truncate(new Date().toISOString(), 100);

    // Insert report
    const reportResult = await pool.query(
      `INSERT INTO ${REPORT_TABLE}
        ("description", "technicianID", "isFollowup",
         "findings", "actionsTaken", "AC_condition",
         "recommendations", "notes", "serviceChecklist",
         "completedDateTime", "materialsTotal",
         "customerAcknowledged", "job_ID")
       VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12, $13
       )
       RETURNING "reportID"`,
      [
        description,
        technicianID,
        Boolean(followUpRequired),
        findingsStr,
        actionsStr,
        truncate(overallCondition, 200),
        recommendationsStr,
        truncate(internalNotes, 200),
        checklistStr,
        completedStr,
        Number(materialsTotal) || 0,
        Boolean(customerAcknowledged),
        job_ID
      ]
    );

    const reportID = reportResult.rows[0].reportID;

    // Insert materials used
    if (Array.isArray(materials) && materials.length > 0) {
      for (const material of materials) {
        if (!material.itemID) continue;

        await pool.query(
          `INSERT INTO "new_jobBooking"."partsUsed"
            ("reportID", "itemID", "quantityUsed", "unitCost")
           VALUES ($1, $2, $3, $4)`,
          [
            reportID,
            Number.parseInt(material.itemID, 10),
            Number(material.quantity) || 1,
            Number(material.unitCost) || 0
          ]
        );
      }
    }

    // Follow-up booking is non-fatal if creation fails.
    if (followUpRequired) {
      try {
        await createFollowUpBooking(pool, {
          sourceBookingId: job_ID,
          reasons: followUpReasons,
          otherReason: followUpOtherReason,
          followUpDate,
          priority: followUpPriority
        });
      } catch (fuErr) {
        console.error(
          '[Cool Fix] Follow-up booking creation skipped:',
          fuErr.message
        );
      }
    }

    return res.status(201).json({
      success: true,
      reportID,
      message: 'Service report submitted successfully. You can now mark the job as completed.'
    });

  } catch (err) {
    console.error('[Cool Fix] POST Report Error:', err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// =============================================================================
// REPORT-TO-BOOKING MAPPING
// =============================================================================

const REPORT_BOOKING_CTE = `
  WITH report_bookings AS (
    SELECT
      j."serviceReport" AS report_id,
      COUNT(DISTINCT w."booking_ID")::INTEGER AS booking_count,
      CASE
        WHEN COUNT(DISTINCT w."booking_ID") = 1
        THEN MIN(w."booking_ID")
      END AS booking_id
    FROM "new_jobBooking".job j
    LEFT JOIN "new_jobBooking".work w
      ON w."job_ID" = j."job_ID"
    WHERE j."serviceReport" IS NOT NULL
    GROUP BY j."serviceReport"
  )
`;

function verifiedBookingRows(rows, bookingField) {
  if (
    rows.some(row =>
      row._bookingCount !== 1 ||
      !Number.isSafeInteger(row[bookingField]) ||
      row[bookingField] <= 0
    )
  ) {
    throw new Error(
      'Report booking mapping is unavailable or ambiguous.'
    );
  }

  return rows.map(({ _bookingCount, ...row }) => row);
}

// =============================================================================
// GET ALL REPORTS
// =============================================================================

const getReports = async (req, res) => {
  try {
    const techId = getTechnicianId(req, res);

    if (techId === null) return;

    const result = await pool.query(
      REPORT_BOOKING_CTE + `
        SELECT
          sr.*,
          b."booking_ID" AS "job_ID",
          b.status AS "jobStatus",
          rb.booking_count AS "_bookingCount"
        FROM ${REPORT_TABLE} sr
        LEFT JOIN report_bookings rb
          ON rb.report_id = sr."reportID"
        LEFT JOIN "new_jobBooking"."Booking" b
          ON b."booking_ID" = rb.booking_id
        WHERE sr."technicianID" = $1
        ORDER BY sr."reportID" DESC
      `,
      [techId]
    );

    return res.json({
      success: true,
      reports: verifiedBookingRows(result.rows, 'job_ID')
    });

  } catch (err) {
    console.error('[Cool Fix] GET Reports Error:', err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// =============================================================================
// GET REPORT BY ID
// =============================================================================

const getReportById = async (req, res) => {
  try {
    const reportId = Number.parseInt(req.params.id, 10);

    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const result = await pool.query(
      REPORT_BOOKING_CTE + `
        SELECT
          sr.*,
          b."booking_ID" AS "job_ID",
          b.status AS "jobStatus",
          c.customer_name,
          rb.booking_count AS "_bookingCount"
        FROM ${REPORT_TABLE} sr
        LEFT JOIN report_bookings rb
          ON rb.report_id = sr."reportID"
        LEFT JOIN "new_jobBooking"."Booking" b
          ON b."booking_ID" = rb.booking_id
        LEFT JOIN "user3"."newCustomer" c
          ON b."customer_ID" = c."customer_ID"
        WHERE sr."reportID" = $1
      `,
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    return res.json({
      success: true,
      report: verifiedBookingRows(result.rows, 'job_ID')[0]
    });

  } catch (err) {
    console.error('[Cool Fix] GET Report Error:', err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// =============================================================================
// GET PARTS LOG
// =============================================================================

const getPartsLog = async (req, res) => {
  try {
    const techId = getTechnicianId(req, res);

    if (techId === null) return;

    const query = REPORT_BOOKING_CTE + `
      SELECT
        sr."reportID",
        pu."itemID",
        ii."itemName",
        ii.price,
        1 AS quantity_used,
        COALESCE(ii.stock, 0) AS "currentStock",
        ii."itemType",
        ii.description AS "itemDesc",
        sr."technicianID",
        b."booking_ID" AS "bookingID",
        b."booking_ID" AS "jobID",
        rb.booking_count AS "_bookingCount",
        b.status AS "jobStatus",
        COALESCE(c.customer_name, 'Guest Customer') AS "customerName",
        'Aircon Servicing' AS "serviceName",
        TO_CHAR(b."date", 'YYYY-MM-DD') AS "bookingDate",
        b.location,
        TO_CHAR(b."time", 'HH24:MI:SS') AS "bookingTime"

      FROM ${REPORT_TABLE} sr

      INNER JOIN "new_jobBooking"."partsUsed" pu
        ON sr."reportID" = pu."reportID"

      INNER JOIN "inventory"."inventoryItem" ii
        ON pu."itemID" = ii."itemID"

      LEFT JOIN report_bookings rb
        ON rb.report_id = sr."reportID"

      LEFT JOIN "new_jobBooking"."Booking" b
        ON b."booking_ID" = rb.booking_id

      LEFT JOIN "user3"."newCustomer" c
        ON b."customer_ID" = c."customer_ID"

      WHERE sr."technicianID" = $1

      ORDER BY sr."reportID" DESC, ii."itemName" ASC
    `;

    const result = await pool.query(query, [techId]);

    const records = verifiedBookingRows(
      result.rows,
      'bookingID'
    ).map(row => {
      let displayTime = '-';

      // SQL TIME is a wall-clock value, not a timezone-aware instant.
      const clock = typeof row.bookingTime === 'string'
        ? /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.exec(row.bookingTime)
        : null;

      if (clock) {
        const hour = Number(clock[1]);

        displayTime =
          (hour % 12 || 12) +
          ':' + clock[2] +
          (hour >= 12 ? ' PM' : ' AM');
      }

      return {
        reportID: row.reportID,
        itemID: row.itemID,
        itemName: row.itemName,

        itemDescription:
          row.itemDesc ||
          (
            row.itemName +
            ' - $' +
            Number(row.price || 0).toFixed(2) +
            ' per unit'
          ),

        itemType: row.itemType || 'General',
        currentStock: row.currentStock,
        quantityUsed: row.quantity_used,
        unitCost: row.price,

        jobID: row.jobID || row.bookingID,

        displayJobCode:
          '#BK' +
          String(row.jobID || row.bookingID).padStart(3, '0'),

        bookingID: row.bookingID,
        technicianID: row.technicianID,
        jobStatus: row.jobStatus,
        customerName: row.customerName,
        serviceName: row.serviceName || 'Aircon Servicing',
        bookingDate: row.bookingDate,
        formattedDate: row.bookingDate,
        bookingTime: displayTime,
        location: row.location || 'Singapore'
      };
    });

    return res.json({
      success: true,
      records
    });

  } catch (err) {
    console.error('[Cool Fix] GET Parts Log Error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
      records: []
    });
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  submitReport,
  getReports,
  getReportById,
  getPartsLog
};
