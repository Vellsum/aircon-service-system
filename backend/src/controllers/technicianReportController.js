
const pool = require('../config/supabaseDb');

const REPORT_TABLE = '"new_jobBooking"."serviceReport"';

function truncate(str, maxLen) {
  if (!str) return null;

  str = String(str);

  return str.length > maxLen
    ? str.substring(0, maxLen - 3) + '...'
    : str;
}

function arrayToCsv(arr, maxLen) {
  if (!Array.isArray(arr) || arr.length === 0) return null;

  var csv = arr.join(', ');
  return truncate(csv, maxLen);
}

// =============================================================================
// FOLLOW-UP AUTO-BOOKING
// Creates a real follow-up booking, job, and work link.
// =============================================================================
async function createFollowUpBooking(
  pool,
  { sourceBookingId, reasons, otherReason, followUpDate, priority }
) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const src = await client.query(
      `SELECT
          "customer_ID",
          "technician_ID",
          location
       FROM "new_jobBooking"."Booking"
       WHERE "booking_ID" = $1`,
      [Number(sourceBookingId)]
    );

    const s = src.rows[0];

    if (!s || !s.technician_ID) {
      await client.query('ROLLBACK');
      return null;
    }

    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(followUpDate || ''))
      ? String(followUpDate)
      : new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .split('T')[0];

    const comment = `Follow-up visit${priority ? ` (${priority} priority)` : ''}: ${
      [...(reasons || []), otherReason]
        .filter(Boolean)
        .join(', ') || 'Recommended by technician'
    }`;

    // Confirmed service primary key: service_id
    const svc = await client.query(
      `SELECT service_id
       FROM "payables".service
       ORDER BY service_id
       LIMIT 1`
    );

    if (svc.rows.length === 0) {
      throw new Error('No service exists in payables.service.');
    }

    const ins = await client.query(
      `INSERT INTO "new_jobBooking"."Booking"
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
       VALUES ($1, $2, $3::DATE, '09:00'::TIME, TRUE, $4, 'Scheduled', $5)
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

    const j = await client.query(
      `INSERT INTO "new_jobBooking"."job"
        (job_status, "isFollowup", "serviceID")
       VALUES ('Pending', TRUE, $1)
       RETURNING "job_ID"`,
      [svc.rows[0].service_id]
    );

    const newJobId = j.rows[0].job_ID;

    await client.query(
      `INSERT INTO "new_jobBooking"."work"
        ("job_ID", "booking_ID")
       VALUES ($1, $2)`,
      [newJobId, newBookingId]
    );

    await client.query('COMMIT');

    return newBookingId;

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}


// =============================================================================
// SUBMIT SERVICE REPORT
// =============================================================================
var submitReport = async (req, res) => {
  try {
    var job_ID = req.body.job_ID;
    var findings = req.body.findings;
    var findingsOther = req.body.findingsOther;
    var actionsTaken = req.body.actionsTaken;
    var actionsOther = req.body.actionsOther;
    var overallCondition = req.body.overallCondition;
    var checklistItems = req.body.checklistItems;
    var materials = req.body.materials;
    var materialsTotal = req.body.materialsTotal;
    var followUpRequired = req.body.followUpRequired;
    var followUpReasons = req.body.followUpReasons;
    var followUpOtherReason = req.body.followUpOtherReason;
    var followUpDate = req.body.followUpDate;
    var followUpPriority = req.body.followUpPriority;
    var completionDateTime = req.body.completionDateTime;
    var customerAcknowledged = req.body.customerAcknowledged;
    var internalNotes = req.body.internalNotes;

    if (!job_ID) {
      return res.status(400).json({ error: 'job_ID is required' });
    }

    if (!overallCondition) {
      return res.status(400).json({ error: 'overallCondition is required' });
    }

    if (!Array.isArray(findings) || findings.length === 0) {
      return res.status(400).json({ error: 'At least one finding is required' });
    }

    if (!Array.isArray(actionsTaken) || actionsTaken.length === 0) {
      return res.status(400).json({ error: 'At least one action is required' });
    }

    var bookingId = parseInt(job_ID, 10);

    if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    var descParts = [];

    if (findings.length > 0) descParts.push(findings[0]);
    if (actionsTaken.length > 0) descParts.push(actionsTaken[0]);

    var description = truncate(descParts.join(' + '), 100) || 'Service report';

    var techResult = await pool.query(
      `SELECT "technician_ID"
       FROM "new_jobBooking"."Booking"
       WHERE "booking_ID" = $1`,
      [bookingId]
    );

    if (techResult.rows.length === 0) {
      return res.status(400).json({ error: 'Booking not found' });
    }

    var technicianID = techResult.rows[0].technician_ID;

    var findingsArr = findings.slice();

    if (findingsOther && findingsOther.trim()) {
      findingsArr.push(findingsOther.trim());
    }

    var findingsStr = arrayToCsv(findingsArr, 200);

    var actionsArr = actionsTaken.slice();

    if (actionsOther && actionsOther.trim()) {
      actionsArr.push(actionsOther.trim());
    }

    var actionsStr = arrayToCsv(actionsArr, 200);

    var recommendationsStr = null;

    if (
      followUpRequired &&
      Array.isArray(followUpReasons) &&
      followUpReasons.length > 0
    ) {
      var recParts = [];

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

    var checklistStr = arrayToCsv(checklistItems, 200);

    var completedStr = completionDateTime
      ? truncate(new Date(completionDateTime).toISOString(), 100)
      : truncate(new Date().toISOString(), 100);

    // Insert report.
    const reportResult = await pool.query(
      `INSERT INTO ${REPORT_TABLE}
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
          "comepletedDateTime",
          "materialsTotal",
          "customerAcknowledged",
          "job_ID"
        )
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
        bookingId
      ]
    );

    var reportID = reportResult.rows[0].reportID;

    // Save materials used.
    if (Array.isArray(materials) && materials.length > 0) {
      for (var i = 0; i < materials.length; i++) {
        var material = materials[i];

        if (!material.itemID) continue;

        await pool.query(
          `INSERT INTO "new_jobBooking"."partsUsed"
            ("reportID", "itemID", "quantityUsed", "unitCost")
           VALUES ($1, $2, $3, $4)`,
          [
            reportID,
            parseInt(material.itemID, 10),
            Number(material.quantity) || 1,
            Number(material.unitCost) || 0
          ]
        );
      }
    }

    // Report submission does not automatically complete the booking.
    // Technician must click Complete separately.

    // Create follow-up booking if required.
    if (followUpRequired) {
      try {
        await createFollowUpBooking(pool, {
          sourceBookingId: bookingId,
          reasons: followUpReasons,
          otherReason: followUpOtherReason,
          followUpDate: followUpDate,
          priority: followUpPriority
        });
      } catch (fuErr) {
        console.error(
          '[Cool Fix] Follow-up booking creation skipped:',
          fuErr.message
        );
      }
    }

    res.status(201).json({
      success: true,
      reportID: reportID,
      message: 'Service report submitted successfully. You can now mark the job as completed.'
    });

  } catch (err) {
    console.error('[Cool Fix] POST Report Error:', err.message);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// =============================================================================
// REPORT → BOOKING MAPPING
// =============================================================================
const REPORT_BOOKING_CTE = `
  WITH ReportBookings AS (
    SELECT
      j."serviceReport" AS "reportID",
      COUNT(DISTINCT w."booking_ID")::INTEGER AS "bookingCount",
      CASE
        WHEN COUNT(DISTINCT w."booking_ID") = 1
        THEN MIN(w."booking_ID")
      END AS "bookingID"
    FROM "new_jobBooking"."job" j
    LEFT JOIN "new_jobBooking"."work" w
      ON w."job_ID" = j."job_ID"
    WHERE j."serviceReport" IS NOT NULL
    GROUP BY j."serviceReport"
  )
`;

function verifiedBookingRows(rows, bookingField) {
  if (
    rows.some(row =>
      Number(row._bookingCount) !== 1 ||
      !Number.isSafeInteger(Number(row[bookingField])) ||
      Number(row[bookingField]) <= 0
    )
  ) {
    throw new Error('Report booking mapping is unavailable or ambiguous.');
  }

  return rows.map(({ _bookingCount, ...row }) => row);
}


// =============================================================================
// GET ALL REPORTS
// =============================================================================
var getReports = async (req, res) => {
  try {
    var pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    var techId = parseInt(req.query.techId, 10) || 1;

    var result = await pool.query(
      REPORT_BOOKING_CTE +
      ` SELECT
          sr.*,
          b."booking_ID" AS job_ID,
          b.status AS "jobStatus",
          rb."bookingCount" AS "_bookingCount"
        FROM ${REPORT_TABLE} sr
        LEFT JOIN ReportBookings rb
          ON rb."reportID" = sr."reportID"
        LEFT JOIN "new_jobBooking"."Booking" b
          ON b."booking_ID" = rb."bookingID"
        WHERE sr."technicianID" = $1
        ORDER BY sr."reportID" DESC`,
      [techId]
    );

    res.json({
      success: true,
      reports: verifiedBookingRows(result.rows, 'job_ID')
    });

  } catch (err) {
    console.error('[Cool Fix] GET Reports Error:', err.message);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// =============================================================================
// GET REPORT BY ID
// =============================================================================
var getReportById = async (req, res) => {
  try {
    var reportId = parseInt(req.params.id, 10);

    var result = await pool.query(
      REPORT_BOOKING_CTE +
      ` SELECT
          sr.*,
          b."booking_ID" AS job_ID,
          b.status AS "jobStatus",
          c.customer_name,
          rb."bookingCount" AS "_bookingCount"
        FROM ${REPORT_TABLE} sr
        LEFT JOIN ReportBookings rb
          ON rb."reportID" = sr."reportID"
        LEFT JOIN "new_jobBooking"."Booking" b
          ON b."booking_ID" = rb."bookingID"
        LEFT JOIN "user3"."newCustomer" c
          ON b."customer_ID" = c."customer_ID"
        WHERE sr."reportID" = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      success: true,
      report: verifiedBookingRows(result.rows, 'job_ID')[0]
    });

  } catch (err) {
    console.error('[Cool Fix] GET Report Error:', err.message);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// =============================================================================
// GET PARTS LOG
// =============================================================================
var getPartsLog = async (req, res) => {
  try {
    var techId = parseInt(req.query.techId, 10) || 1;

    var query = REPORT_BOOKING_CTE +
      ` SELECT
          sr."reportID",
          pu."itemID",
          ii."itemName",
          ii.price,
          COALESCE(pu."quantityUsed", 1) AS quantity_used,
          COALESCE(ii.stock, 0) AS "currentStock",
          ii."itemType",
          ii.description AS "itemDesc",
          sr."technicianID",
          b."booking_ID" AS "bookingID",
          b."booking_ID" AS "jobID",
          rb."bookingCount" AS "_bookingCount",
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
        LEFT JOIN ReportBookings rb
          ON rb."reportID" = sr."reportID"
        LEFT JOIN "new_jobBooking"."Booking" b
          ON b."booking_ID" = rb."bookingID"
        LEFT JOIN "user3"."newCustomer" c
          ON b."customer_ID" = c."customer_ID"
        WHERE sr."technicianID" = $1
        ORDER BY sr."reportID" DESC, ii."itemName" ASC`;

    var result = await pool.query(query, [techId]);

    var records = verifiedBookingRows(result.rows, 'bookingID').map(function(row) {
      var displayTime = '-';

      // SQL TIME is a wall-clock value, not an instant.
      var clock = typeof row.bookingTime === 'string'
        ? /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.exec(row.bookingTime)
        : null;

      if (clock) {
        var hour = Number(clock[1]);

        displayTime =
          (hour % 12 || 12) +
          ':' +
          clock[2] +
          (hour >= 12 ? ' PM' : ' AM');
      }

      return {
        reportID: row.reportID,
        itemID: row.itemID,
        itemName: row.itemName,
        itemDescription:
          row.itemDesc ||
          (row.itemName + ' - $' + Number(row.price || 0).toFixed(2) + ' per unit'),
        itemType: row.itemType || 'General',
        currentStock: row.currentStock,
        quantityUsed: row.quantity_used,
        unitCost: row.price,
        jobID: row.jobID || row.bookingID,
        displayJobCode: '#BK' + String(row.jobID || row.bookingID).padStart(3, '0'),
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

    res.json({
      success: true,
      records: records
    });

  } catch (err) {
    console.error('[Cool Fix] GET Parts Log Error:', err.message);

    res.status(500).json({
      success: false,
      message: err.message,
      records: []
    });
  }
};


module.exports = {
  submitReport,
  getReports,
  getReportById,
  getPartsLog
};
