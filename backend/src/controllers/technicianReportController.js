const { poolPromise, sql } = require('../config/db');

const REPORT_TABLE = '[new_jobBooking].[serviceReport]';

function truncate(str, maxLen) {
  if (!str) return null;
  return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}

function arrayToCsv(arr, maxLen) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  var csv = arr.join(', ');
  return truncate(csv, maxLen);
}

// =============================================================================
// 6 Oct 2026 — FOLLOW-UP AUTO-BOOKING
// When a report flags "follow-up required", create the return visit as a real
// booking (isFollowup = 1) for the same customer, assigned to the same
// technician, so it appears on their Follow-Up page and Assigned Jobs.
// Creates the job + work link too — otherwise the completion gate blocks it.
// =============================================================================
async function createFollowUpBooking(pool, { sourceBookingId, reasons, otherReason, followUpDate, priority }) {
  const src = await pool.request()
    .input('bid', sql.Int, Number(sourceBookingId))
    .query(`SELECT customer_ID, technician_ID, location
              FROM [new_jobBooking].[Booking] WHERE booking_ID = @bid`);
  const s = src.recordset[0];
  if (!s || !s.technician_ID) return null;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(followUpDate || ''))
    ? String(followUpDate)
    : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]; // fallback: +7 days
  const comment = `Follow-up visit${priority ? ` (${priority} priority)` : ''}: ${
    [...(reasons || []), otherReason].filter(Boolean).join(', ') || 'Recommended by technician'}`;

  const ins = await pool.request()
    .input('cid', sql.Int, s.customer_ID)
    .input('tid', sql.Int, s.technician_ID)
    .input('date', sql.VarChar(10), date)
    .input('loc', sql.VarChar(100), s.location)
    .input('comment', sql.VarChar(500), comment)
    .query(`INSERT INTO [new_jobBooking].[Booking] (customer_ID, technician_ID, [date], [time], isFollowup, location, [status], comments)
            OUTPUT INSERTED.booking_ID
            VALUES (@cid, @tid, @date, '09:00', 1, @loc, 'Scheduled', @comment)`);
  const newBookingId = ins.recordset[0].booking_ID;

  // job + work link (required for reports/completion later)
  const svc = await pool.request().query(`SELECT TOP 1 service_id FROM [payables].[service] ORDER BY service_id`);
  const j = await pool.request()
    .input('svc', sql.Int, svc.recordset[0]?.service_id)
    .query(`INSERT INTO [new_jobBooking].[job] (job_status, isFollowup, serviceID)
            OUTPUT INSERTED.job_ID VALUES ('Pending', 1, @svc)`);
  await pool.request()
    .input('jid', sql.Int, j.recordset[0].job_ID)
    .input('bid', sql.Int, newBookingId)
    .query(`INSERT INTO [new_jobBooking].[work] (job_ID, booking_ID) VALUES (@jid, @bid)`);

  return newBookingId;
}
var submitReport = async (req, res) => {
  try {
    var pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

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

    if (!job_ID) return res.status(400).json({ error: 'job_ID is required' });
    if (!overallCondition) return res.status(400).json({ error: 'overallCondition is required' });
    if (!Array.isArray(findings) || findings.length === 0) return res.status(400).json({ error: 'At least one finding is required' });
    if (!Array.isArray(actionsTaken) || actionsTaken.length === 0) return res.status(400).json({ error: 'At least one action is required' });

    var descParts = [];
    if (findings.length > 0) descParts.push(findings[0]);
    if (actionsTaken.length > 0) descParts.push(actionsTaken[0]);
    var description = truncate(descParts.join(' + '), 100) || 'Service report';

    var techResult = await pool.request()
      .input('bookingId', sql.Int, parseInt(job_ID))
      .query('SELECT technician_ID FROM [new_jobBooking].[Booking] WHERE booking_ID = @bookingId');

    if (techResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Booking not found' });
    }
    var technicianID = techResult.recordset[0].technician_ID;

    var findingsArr = findings.slice();
    if (findingsOther && findingsOther.trim()) findingsArr.push(findingsOther.trim());
    var findingsStr = arrayToCsv(findingsArr, 200);

    var actionsArr = actionsTaken.slice();
    if (actionsOther && actionsOther.trim()) actionsArr.push(actionsOther.trim());
    var actionsStr = arrayToCsv(actionsArr, 200);

    var recommendationsStr = null;
    if (followUpRequired && Array.isArray(followUpReasons) && followUpReasons.length > 0) {
      var recParts = [];
      recParts.push(followUpReasons.join(', '));
      if (followUpOtherReason) recParts.push(followUpOtherReason);
      if (followUpPriority) recParts.push('Priority: ' + followUpPriority);
      if (followUpDate) recParts.push('By: ' + followUpDate);
      recommendationsStr = truncate(recParts.join(' | '), 200);
    }

    var checklistStr = arrayToCsv(checklistItems, 200);

    var completedStr = completionDateTime
      ? truncate(new Date(completionDateTime).toISOString(), 100)
      : truncate(new Date().toISOString(), 100);

    var reportQuery = 'INSERT INTO ' + REPORT_TABLE + ' (description, technicianID, isFollowup, findings, actionsTaken, AC_condition, recommendations, notes, serviceChecklist, comepletedDateTime, materialsTotal, customerAcknowledged, job_ID) OUTPUT INSERTED.reportID VALUES (@description, @technicianID, @isFollowup, @findings, @actionsTaken, @AC_condition, @recommendations, @notes, @serviceChecklist, @comepletedDateTime, @materialsTotal, @customerAcknowledged, @job_ID)';

    var reportRequest = pool.request();
    reportRequest.input('description', sql.VarChar(100), description);
    reportRequest.input('technicianID', sql.Int, technicianID);
    reportRequest.input('isFollowup', sql.Bit, followUpRequired ? 1 : 0);
    reportRequest.input('findings', sql.VarChar(200), findingsStr);
    reportRequest.input('actionsTaken', sql.VarChar(200), actionsStr);
    reportRequest.input('AC_condition', sql.VarChar(200), truncate(overallCondition, 200));
    reportRequest.input('recommendations', sql.VarChar(200), recommendationsStr);
    reportRequest.input('notes', sql.VarChar(200), truncate(internalNotes, 200));
    reportRequest.input('serviceChecklist', sql.VarChar(200), checklistStr);
    reportRequest.input('comepletedDateTime', sql.VarChar(100), completedStr);
    reportRequest.input('materialsTotal', sql.Decimal(10, 2), materialsTotal || 0);
    reportRequest.input('customerAcknowledged', sql.Bit, customerAcknowledged ? 1 : 0);
    reportRequest.input('job_ID', sql.Int, parseInt(job_ID));

    var reportResult = await reportRequest.query(reportQuery);
    var reportID = reportResult.recordset[0].reportID;

    if (Array.isArray(materials) && materials.length > 0) {
      for (var i = 0; i < materials.length; i++) {
        var material = materials[i];
        if (!material.itemID) continue;
        await pool.request()
          .input('reportID', sql.Int, reportID)
          .input('itemID', sql.Int, parseInt(material.itemID))
          .input('quantityUsed', sql.Int, Number(material.quantity) || 1)   // 6 Oct 2026: persist qty (column exists now)
          .input('unitCost', sql.Float, Number(material.unitCost) || 0)     // 6 Oct 2026: persist cost
          .query('INSERT INTO [new_jobBooking].[partsUsed] (reportID, itemID, quantityUsed, unitCost) VALUES (@reportID, @itemID, @quantityUsed, @unitCost)');
      }
    }

    // =====================================================================
    // 6 Oct 2026 — CHANGED: report no longer auto-completes the booking.
    // Flow is now: Start → submit report (In Progress) → technician clicks
    // Complete → updateJobStatus's report gate verifies and completes.
    // The old "UPDATE ... SET status = 'Completed'" here bypassed the gate
    // and made report-before-complete impossible.
    // =====================================================================

    // 6 Oct 2026 — create the return visit if the report flags follow-up
    // (helper defined at the top of this file — was previously never called)
    if (followUpRequired) {
      try {
        await createFollowUpBooking(pool, {
          sourceBookingId: job_ID,
          reasons: followUpReasons,
          otherReason: followUpOtherReason,
          followUpDate: followUpDate,
          priority: followUpPriority,
        });
      } catch (fuErr) {
        console.error('[Cool Fix] Follow-up booking creation skipped:', fuErr.message);
        // non-fatal: the report itself is already saved
      }
    }

    res.status(201).json({
      success: true,
      reportID: reportID,
      message: 'Service report submitted successfully. You can now mark the job as completed.'
    });

  } catch (err) {
    console.error('[Cool Fix] POST Report Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

var getReports = async (req, res) => {
  try {
    var pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, reports: [] });

    var techId = parseInt(req.query.techId, 10) || 1;

    var result = await pool.request()
      .input('techId', sql.Int, techId)
      .query('SELECT sr.*, b.status AS jobStatus FROM ' + REPORT_TABLE + ' sr LEFT JOIN [new_jobBooking].[Booking] b ON sr.job_ID = b.booking_ID WHERE sr.technicianID = @techId ORDER BY sr.reportID DESC');

    res.json({ success: true, reports: result.recordset });

  } catch (err) {
    console.error('[Cool Fix] GET Reports Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

var getReportById = async (req, res) => {
  try {
    var pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    var result = await pool.request()
      .input('reportId', sql.Int, parseInt(req.params.id))
      .query('SELECT sr.*, b.status AS jobStatus, c.customer_name FROM ' + REPORT_TABLE + ' sr LEFT JOIN [new_jobBooking].[Booking] b ON sr.job_ID = b.booking_ID LEFT JOIN [user3].[newCustomer] c ON b.customer_ID = c.customer_ID WHERE sr.reportID = @reportId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true, report: result.recordset[0] });

  } catch (err) {
    console.error('[Cool Fix] GET Report Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

var getPartsLog = async (req, res) => {
  try {
    var pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, records: [] });

    var techId = parseInt(req.query.techId, 10) || 1;

    var query = 'SELECT sr.reportID, pu.itemID, ii.itemName, ii.price, 1 AS quantity_used, ISNULL(ii.stock, 0) AS currentStock, ii.itemType, ii.description AS itemDesc, sr.technicianID, sr.job_ID AS bookingID, b.booking_ID AS jobID, b.status AS jobStatus, ISNULL(c.customer_name, \'Guest Customer\') AS customerName, \'Aircon Servicing\' AS serviceName, CONVERT(VARCHAR(10), b.[date], 120) AS bookingDate, b.location, b.[time] AS bookingTime FROM [new_jobBooking].[serviceReport] sr INNER JOIN [new_jobBooking].[partsUsed] pu ON sr.reportID = pu.reportID INNER JOIN [inventory].[inventoryItem] ii ON pu.itemID = ii.itemID LEFT JOIN [new_jobBooking].[Booking] b ON sr.job_ID = b.booking_ID LEFT JOIN [user3].[newCustomer] c ON b.customer_ID = c.customer_ID WHERE sr.technicianID = @techId ORDER BY sr.reportID DESC, ii.itemName ASC';

    var result = await pool.request()
      .input('techId', sql.Int, techId)
      .query(query);

    var records = result.recordset.map(function(row) {
      var displayTime = '-';
      if (row.bookingTime) {
        var timeStr = String(row.bookingTime);
        if (timeStr.indexOf('T') !== -1) {
          var timePart = timeStr.split('T')[1].substring(0, 5);
          var h = parseInt(timePart.split(':')[0]);
          var m = parseInt(timePart.split(':')[1]);
          var ampm = h >= 12 ? 'PM' : 'AM';
          var hour12 = h % 12 || 12;
          displayTime = hour12 + ':' + String(m).padStart(2, '0') + ' ' + ampm;
        } else if (timeStr.indexOf(':') !== -1) {
          if (timeStr.indexOf('AM') === -1 && timeStr.indexOf('PM') === -1) {
            var h2 = parseInt(timeStr.split(':')[0]);
            var m2 = parseInt(timeStr.split(':')[1]);
            var ampm2 = h2 >= 12 ? 'PM' : 'AM';
            var hour12b = h2 % 12 || 12;
            displayTime = hour12b + ':' + String(m2).padStart(2, '0') + ' ' + ampm2;
          } else {
            displayTime = timeStr;
          }
        }
      }

      return {
        reportID: row.reportID,
        itemID: row.itemID,
        itemName: row.itemName,
        itemDescription: row.itemDesc || (row.itemName + ' - $' + Number(row.price || 0).toFixed(2) + ' per unit'),
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

    res.json({ success: true, records: records });

  } catch (err) {
    console.error('[Cool Fix] GET Parts Log Error:', err.message);
    res.status(500).json({ success: false, message: err.message, records: [] });
  }
};

module.exports = {
  submitReport: submitReport,
  getReports: getReports,
  getReportById: getReportById,
  getPartsLog: getPartsLog
};