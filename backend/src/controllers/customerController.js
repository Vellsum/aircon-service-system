/**
 * Cool Fix - Customer Portal Controller
 * Supabase (PostgreSQL) schema: user3, new_jobbooking, inventory, payables
 * (queries use lowercase names; quoted aliases keep the camelCase keys the JS expects)
 */
const pool = require('../config/supabaseDb'); // pg Pool (Supabase)

const UPCOMING_STATUSES = ['pending', 'assigned', 'in progress', 'scheduled', 'confirmed'];
const SERVICE_INTERVAL_DAYS = 90;
const statusIn = UPCOMING_STATUSES.map((s) => `'${s}'`).join(', ');
// today in Singapore (Supabase servers run in UTC)
const TODAY = "(now() AT TIME ZONE 'Asia/Singapore')::date";
// isdeleted may be boolean / int / text after migration
const NOT_DELETED = "(isdeleted IS NULL OR LOWER(isdeleted::text) IN ('0','false','f','no'))";

function formatTime(raw) {
  try {
    if (!raw) return '09:00 AM';
    if (raw instanceof Date) {
      const h = raw.getUTCHours(), m = raw.getUTCMinutes();
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    }
    const s = String(raw);
    if (s.includes('T')) {
      const [h, m] = s.split('T')[1].substring(0, 5).split(':').map(Number);
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    }
    if (s.includes(':') && !/AM|PM/i.test(s)) {
      const [h, m] = s.split(':').map(Number);
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    }
    return s;
  } catch { return '09:00 AM'; }
}

async function resolveCustomer(pool, id) {
  const base = `
    SELECT nc."customer_ID" AS "customer_ID", nc.customer_name, nc."loyaltyPoints" AS "loyaltyPoints",
           nc.customer_address, nc."totalSpent" AS "totalSpent",
           tu.email, tu."phoneNumber" AS "phoneNumber", tu.username, tu.joined
      FROM user3."newCustomer" nc
      LEFT JOIN user3."topUser" tu ON tu."user_ID" = nc."user_ID"`;
  const byCustomer = await pool.query(`${base} WHERE nc."customer_ID" = $1`, [Number(id)]);
  if (byCustomer.rows.length) return byCustomer.rows[0];
  const byUser = await pool.query(`${base} WHERE nc."user_ID" = $1`, [Number(id)]);
  return byUser.rows[0] || null;
}

//helper method to get booking by the dunno wat ---------------------------------------------------------
const bookingSelect = () => `
  SELECT
    b."booking_ID" AS "booking_ID",
    to_char(b.date, 'YYYY-MM-DD') AS "cleanDate",
    b.time AS "rawTime",
     b.timing,
    b.status, b.location, b.comments,

       to_char(b."RR1_date", 'YYYY-MM-DD') AS "RR1_date",  b."RR1_time" AS "RR1_time", b."RR1_technician" AS "RR1_technician",
       to_char(b."RR2_date", 'YYYY-MM-DD') AS "RR2_date",  b."RR2_time" AS "RR2_time", b."RR2_technician" AS "RR2_technician",
       to_char(b."RR3_date", 'YYYY-MM-DD') AS "RR3_date",  b."RR3_time" AS "RR3_time", b."RR3_technician" AS "RR3_technician",
      b."RR_expiry" AS "RR_expiry",

    t.technician_name,
    COALESCE(t.technician_rating, 5) AS technician_rating,
    COALESCE(t."jobsDone", 0) AS "jobsDone",
    ratings."customerRatingAverage", ratings."customerReviewCount",
    svc.service_name, COALESCE(svc.amount, 0) AS amount,
    rep.report_summary

  FROM "new_jobBooking"."Booking" b
  LEFT JOIN user3.technician t ON t."technician_ID" = b."technician_ID"
  LEFT JOIN LATERAL (
    SELECT AVG(r.stars::numeric)::float8 AS "customerRatingAverage",
           COUNT(*)::int AS "customerReviewCount"
      FROM "new_jobBooking"."bookingRating" r
     WHERE r."technician_ID" = t."technician_ID" AND r.stars BETWEEN 1 AND 5
  ) ratings ON true
  LEFT JOIN LATERAL (
    SELECT STRING_AGG(COALESCE(s.service_name, 'Aircon Service'), ', ') AS service_name,
           SUM(COALESCE(s.price, 0)) AS amount
      FROM "new_jobBooking".work w
      JOIN "new_jobBooking".job j ON j."job_ID" = w."job_ID"
      LEFT JOIN payables.service s ON s.service_id = j."serviceID"
     WHERE w."booking_ID" = b."booking_ID"
  ) svc ON true
  LEFT JOIN LATERAL (
    SELECT STRING_AGG(COALESCE(sr.findings, sr.description), ' ') AS report_summary
      FROM "new_jobBooking".work w
      JOIN "new_jobBooking".job j ON j."job_ID" = w."job_ID"
      LEFT JOIN "new_jobBooking"."serviceReport" sr ON sr."reportID" = j."serviceReport"
     WHERE w."booking_ID" = b."booking_ID"
  ) rep ON true`;

  //helper method to dunno wat --------------------------------------------------------------
function shapeBooking(row, customerUnits = []) {
  return {
    booking_ID: row.booking_ID,
    date: row.cleanDate,
    time: formatTime(row.rawTime),
    timing: row.timing,
    status: row.status || 'Pending',
    location: row.location,
    notes: row.comments,
    service_name: row.service_name || 'Aircon Service',
    amount: Number(row.amount || 0),
    unit_ids: customerUnits.map((u) => u.installed_ID),
    units: customerUnits.map((u) => u.nickname),
    technician: row.technician_name
      ? { name: row.technician_name, rating: Number(row.technician_rating), jobs_done: Number(row.jobsDone),
          customerRatingAverage: row.customerRatingAverage, customerReviewCount: row.customerReviewCount }
      : null,
    report: row.report_summary ? { summary: row.report_summary } : null,

    //the columns returned from db
    RR1_date: row.RR1_date,
   RR1_time: row.RR1_time,
   RR1_technician: row.RR1_technician,

  RR2_date: row.RR2_date,
   RR2_time: row.RR2_time,
   RR2_technician: row.RR2_technician,

     RR3_date: row.RR3_date,
   RR3_time: row.RR3_time,
   RR3_technician: row.RR3_technician,
    RR_expiry: row.RR_expiry,

  };
}

async function getCustomerUnits(pool, customerId) {
  const result = await pool.query(`
    SELECT a."aircon_ID" AS "aircon_ID", a.aircon_make, a.aircon_model, a.aircon_type,
           a."aircon_serialNumber" AS "aircon_serialNumber",
           to_char(ls.last_service, 'YYYY-MM-DD') AS last_service,
           sc.service_count
      FROM inventory."installedAircons" ia
      JOIN inventory.aircon a ON a."aircon_ID" = ia."airconID"
      LEFT JOIN LATERAL (SELECT MAX(b.date) AS last_service
                     FROM "new_jobBooking"."Booking" b
                    WHERE b."customer_ID" = ia."customerID" AND LOWER(b.status) = 'completed') ls ON true
      LEFT JOIN LATERAL (SELECT COUNT(*) AS service_count
                     FROM "new_jobBooking"."Booking" b2
                    WHERE b2."customer_ID" = ia."customerID" AND LOWER(b2.status) = 'completed') sc ON true
     WHERE ia."customerID" = $1
     ORDER BY a."aircon_ID"`, [customerId]);

  return (result.rows || []).map((row) => {
    let nextDue = null;
    if (row.last_service) {
      nextDue = new Date(row.last_service + 'T00:00:00');
      nextDue.setDate(nextDue.getDate() + SERVICE_INTERVAL_DAYS);
    }
    let health = 85;
    if (nextDue) {
      const days = Math.round((nextDue - new Date()) / 86_400_000);
      if (days < 0) health = 55; else if (days <= 30) health = 70;
    }
    return {
      installed_ID: row.aircon_ID,
      nickname: [row.aircon_make, row.aircon_model].filter(Boolean).join(' ') || `Unit #${row.aircon_ID}`,
      brand: row.aircon_make || '—',
      model: row.aircon_model || '',
      type: row.aircon_type || 'Split',
      capacity: null,
      installed_on: null,
      serial_number: row.aircon_serialNumber || null,
      last_service: row.last_service || null,
      next_due: nextDue ? nextDue.toISOString().split('T')[0] : null,
      service_count: Number(row.service_count || 0),
      health,
    };
  });
}

//when customer click RR option===============================================================
const chooseRROption= async(req,res)=> {
//confirm booking n assign technician to booking, update date n time
//req is the request body
console.log(req.booking)
console.log(req.option);
try{
        // TODO: write your RR update query here (original query was empty)
        const result = await pool.query(`-- TODO`);

            return res.status(200).json({
              success: true,
              message: `Booking status updated to ${requestedStatus}. ACCEPTED ALTERNATIVE`,
              bookingId,
              status: requestedStatus
            });

    } catch (err) {
    console.error(
      "[Customer] Update rr selectedion booking status error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update booking status."
    });
  }
}//end of choose RR controller 

//send updated data to db ========================================================================
/**
 * PUT /api/customer/bookings/:bookingId/status
 * Customer approves an assigned booking or requests rescheduling.
 */
const updateIncomingBookingStatus = async (req, res) => {
  console.log("Booking status request reached controller");
console.log("Authenticated user:", req.user);
  try {
    const bookingId = Number(req.params.bookingId);
    const userId = Number(req.user?.id);
    const requestedStatus = String(req.body?.status || "")
      .trim()
      .toLowerCase();  //this will make the new status lower case

    // Validate booking ID and authenticated user.
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID."
      });
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication required."
      });
    }

    // Only allow statuses intended for this customer action.


    // Update only if this booking belongs to the logged-in customer
    // and is currently assigned.
    const result = await pool.query(`
        UPDATE "new_jobBooking"."Booking" AS b
        SET status = $1
        FROM user3."newCustomer" AS c
        WHERE c."customer_ID" = b."customer_ID"
          AND b."booking_ID" = $2
          AND c."user_ID" = $3
      `, [requestedStatus, bookingId, userId]);

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${requestedStatus}.`,
      bookingId,
      status: requestedStatus
    });

  } catch (err) {
    console.error(
      "[Customer] Update incoming booking status error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update booking status."
    });
  }
};

module.exports.updateIncomingBookingStatus =  updateIncomingBookingStatus; //idk wat this does
module.exports.chooseRROption=chooseRROption;


//get customer booking with asssigned status
const getINCOMING=  async (req,res)=>{

  try{  
    //taken from getmybookings
    if (!pool) return res.status(200).json({ success: true, bookings: [] }); //return the bookings component of the response
    const customer = await resolveCustomer(pool, parseInt(req.query.customerId, 10) || 1);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });
    
    const result = await pool.query(

      `${bookingSelect()} WHERE b."customer_ID" = $1
      AND LOWER(b.status) = 'request_reschedule'
       ORDER BY b.date DESC, b.time DESC`, [customer.customer_ID]);

      const unitList = await getCustomerUnits(pool, customer.customer_ID);
    console.log(result); //this is actual result
   
      res.status(200).json({ success: true, bookings: (result.rows || []).map((r) => shapeBooking(r, unitList)) });
   //console.log (res); 
   //above res is bullshit
    } catch (err) {
    console.error('[Cool Fix] GET Customer incoming Error:', err.message);
    res.status(500).json({ success: false, message: err.message, bookings: [] });
  

  }

  
}

/* GET /api/customer/dashboard?customerId=# */
const getDashboard = async (req, res) => {
  try {
    if (!pool) return res.status(200).json({ success: true, profile: null, stats: {}, nextBooking: null, recent: [], units: [] });
    const customer = await resolveCustomer(pool, parseInt(req.query.customerId, 10) || 1);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });
    const cid = customer.customer_ID;

    const statsResult = await pool.query(`
      SELECT SUM(CASE WHEN LOWER(status) IN (${statusIn}) AND date >= ${TODAY} THEN 1 ELSE 0 END) AS upcoming,
             SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM "new_jobBooking"."Booking" WHERE "customer_ID" = $1`, [cid]);

    const nextResult = await pool.query(
      `${bookingSelect()} WHERE b."customer_ID" = $1 AND LOWER(b.status) IN (${statusIn})
         AND b.date >= ${TODAY} ORDER BY b.date, b.time LIMIT 1`, [cid]);

    const recentResult = await pool.query(
      `${bookingSelect()} WHERE b."customer_ID" = $1
         AND (b.date < ${TODAY} OR LOWER(b.status) IN ('completed','cancelled'))
         ORDER BY b.date DESC, b.time DESC LIMIT 4`, [cid]);

    const unitList = await getCustomerUnits(pool, cid);
    const s = statsResult.rows[0] || {};

    return res.status(200).json({
      success: true,
      profile: { customer_ID: cid, customer_name: customer.customer_name,
            loyalty_points: Number(customer.loyaltyPoints || 0), address: customer.customer_address,
            email: customer.email || null, phone: customer.phoneNumber || null,
            username: customer.username || null, joined: customer.joined || null },
      stats: { upcoming: Number(s.upcoming) || 0, units: unitList.length,
               completed: Number(s.completed) || 0, totalSpend: Number(customer.totalSpent) || 0 },
      nextBooking: nextResult.rows.length ? shapeBooking(nextResult.rows[0], unitList) : null,
      recent: (recentResult.rows || []).map((r) => shapeBooking(r, unitList)),
      units: unitList,
    });
  } catch (err) {
    console.error('[Cool Fix] GET Customer Dashboard Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/customer/bookings — identity comes from the verified login token. */
const getMyBookings = async (req, res) => {
  try {
    const customerID = req.ratingCustomer?.customerID;
    if (!Number.isSafeInteger(customerID) || customerID <= 0) {
      return res.status(401).json({ success: false, message: 'Customer authentication is required.' });
    }
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });
    const result = await pool.query(
      `${bookingSelect()} WHERE b."customer_ID" = $1 ORDER BY b.date DESC, b.time DESC`, [customerID]);
    const ratings = await pool.query(`
      SELECT r."booking_ID" AS "booking_ID", r.stars, r."technician_ID" AS "technicianID", r."submittedAt" AS "submittedAt"
      FROM "new_jobBooking"."bookingRating" r
      JOIN "new_jobBooking"."Booking" b ON b."booking_ID" = r."booking_ID"
      WHERE b."customer_ID" = $1 AND r."customer_ID" = $1
    `, [customerID]);
    const ratingByBooking = new Map(ratings.rows.map(({ booking_ID, ...rating }) => [booking_ID, rating]));
    const unitList = await getCustomerUnits(pool, customerID);
    res.status(200).json({ success: true, bookings: (result.rows || []).map((r) => ({
      ...shapeBooking(r, unitList), rating: ratingByBooking.get(r.booking_ID) || null,
    })) });
  } catch (err) {
    console.error('[Cool Fix] GET Customer Bookings Error:', err.message);
    res.status(500).json({ success: false, message: err.message, bookings: [] });
  }
};

/* POST /api/customer/bookings/:bookingId/rate — once per completed booking. */
const rateBooking = async (req, res) => {
  let client;
  let transactionOpen = false;
  try {
    const customerID = req.ratingCustomer?.customerID;
    if (!Number.isSafeInteger(customerID) || customerID <= 0) {
      return res.status(401).json({ success: false, message: 'Customer authentication is required.' });
    }
    const reference = String(req.params.bookingId || '');
    const bookingID = /^\d+$/.test(reference) ? Number(reference) : NaN;
    const stars = req.body?.stars;
    if (!Number.isSafeInteger(bookingID) || bookingID <= 0 || bookingID > 2147483647) {
      return res.status(400).json({ success: false, message: 'A valid booking ID is required.' });
    }
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, message: 'Stars must be an integer from 1 to 5.' });
    }
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });
    client = await pool.connect();
    await client.query('BEGIN');
    transactionOpen = true;

    // FOR UPDATE = Postgres version of UPDLOCK/HOLDLOCK (locks the booking row)
    const bookingResult = await client.query(`
      SELECT "booking_ID" AS "booking_ID", "customer_ID" AS "customer_ID", status
      FROM "new_jobBooking"."Booking"
      WHERE "booking_ID" = $1
      FOR UPDATE
    `, [bookingID]);
    const booking = bookingResult.rows[0];
    if (!booking || booking.customer_ID !== customerID) {
      throw Object.assign(new Error('Booking not found for this customer.'), { statusCode: 404 });
    }
    if (String(booking.status).trim().toLowerCase() !== 'completed') {
      throw Object.assign(new Error('You can only rate completed services.'), { statusCode: 400 });
    }
    const existing = await client.query(`
      SELECT "booking_ID" FROM "new_jobBooking"."bookingRating"
      WHERE "booking_ID" = $1
    `, [bookingID]);
    if (existing.rows.length) {
      throw Object.assign(new Error('You already rated this service.'), { statusCode: 400 });
    }

    // Every target job must have an exclusive, valid report relationship.
    // Attribute the visit to its report technician, never to a later reassignment.
    const links = await client.query(`
      SELECT j."job_ID" AS "job_ID", j."serviceReport" AS "serviceReport",
        sr."reportID" AS "reportID", sr."technicianID" AS "technicianID",
        t."technician_ID" AS "performedTechnicianID",
        (SELECT COUNT(*) FROM "new_jobBooking".work ow
         WHERE ow."job_ID" = w."job_ID" AND ow."booking_ID" <> $1)::int AS "otherBookingCount",
        (SELECT COUNT(*) FROM "new_jobBooking".job rj
         JOIN "new_jobBooking".work rw ON rw."job_ID" = rj."job_ID"
         WHERE rj."serviceReport" = sr."reportID" AND rw."booking_ID" <> $1)::int AS "otherReportBookingCount"
      FROM "new_jobBooking".work w
      LEFT JOIN "new_jobBooking".job j ON j."job_ID" = w."job_ID"
      LEFT JOIN "new_jobBooking"."serviceReport" sr ON sr."reportID" = j."serviceReport"
      LEFT JOIN user3.technician t ON t."technician_ID" = sr."technicianID"
      WHERE w."booking_ID" = $1
      ORDER BY j."job_ID"
    `, [bookingID]);
    const jobs = links.rows;
    if (!jobs.length || new Set(jobs.map(j => j.job_ID)).size !== jobs.length
      || jobs.some(j => !Number.isSafeInteger(j.job_ID) || j.job_ID <= 0
        || !Number.isSafeInteger(j.reportID) || j.reportID <= 0 || j.reportID !== j.serviceReport
        || !Number.isSafeInteger(j.technicianID) || j.technicianID <= 0
        || j.technicianID !== j.performedTechnicianID
        || j.otherBookingCount !== 0 || j.otherReportBookingCount !== 0)
      || new Set(jobs.map(j => j.technicianID)).size !== 1) {
      throw Object.assign(new Error('Performed technician attribution is unavailable or ambiguous.'), { statusCode: 400 });
    }
    const technicianID = jobs[0].technicianID;
    const inserted = await client.query(`
        INSERT INTO "new_jobBooking"."bookingRating" ("booking_ID", "customer_ID", "technician_ID", stars)
        VALUES ($1, $2, $3, $4)
        RETURNING "booking_ID" AS "booking_ID", stars, "technician_ID" AS "technicianID", "submittedAt" AS "submittedAt"
      `, [bookingID, customerID, technicianID, stars]);
    const rating = inserted.rows[0];
    if (inserted.rows.length !== 1 || rating.booking_ID !== bookingID
      || rating.stars !== stars || rating.technicianID !== technicianID || !rating.submittedAt) {
      throw new Error('Rating insertion could not be verified.');
    }
    await client.query('COMMIT');
    transactionOpen = false;
    return res.status(201).json({ success: true, rating });
  } catch (err) {
    if (transactionOpen) {
      try { await client.query('ROLLBACK'); }
      catch { return res.status(500).json({ success: false, message: 'Rating transaction could not be rolled back.' }); }
    }
    const duplicate = err.code === '23505'; // Postgres unique_violation
    return res.status(duplicate ? 400 : err.statusCode || 500).json({
      success: false,
      message: duplicate ? 'You already rated this service.' : err.statusCode ? err.message : 'Rating could not be saved.',
    });
  } finally {
    if (client) client.release();
  }
};

/* GET /api/customer/units?customerId=# */
const getMyUnits = async (req, res) => {
  try {
    if (!pool) return res.status(200).json({ success: true, units: [] });
    const customer = await resolveCustomer(pool, parseInt(req.query.customerId, 10) || 1);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });
    const units = await getCustomerUnits(pool, customer.customer_ID);
    res.status(200).json({ success: true, units });
  } catch (err) {
    console.error('[Cool Fix] GET Customer Units Error:', err.message);
    res.status(500).json({ success: false, message: err.message, units: [] });
  }
};

/* POST /api/customer/units?customerId=# */
const registerUnit = async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });
    const customer = await resolveCustomer(pool, parseInt(req.query.customerId, 10) || 1);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });
    const { brand, model, type, serialNumber } = req.body || {};
    if (!brand && !model) return res.status(400).json({ success: false, message: 'Provide at least a brand or model.' });

    const airconRes = await pool.query(
      `INSERT INTO inventory.aircon (aircon_make, aircon_model, aircon_type, "aircon_serialNumber", "isInstalled")
       VALUES ($1, $2, $3, $4, true)
       RETURNING "aircon_ID" AS "aircon_ID"`,
      [brand || 'Unknown', model || '', type || 'Split', serialNumber || null]);
    const airconId = airconRes.rows[0].aircon_ID;
    await pool.query(`INSERT INTO inventory."installedAircons" ("airconID", "customerID") VALUES ($1, $2)`,
      [airconId, customer.customer_ID]);
    res.status(201).json({ success: true, installed_ID: airconId, nickname: [brand, model].filter(Boolean).join(' ') });
  } catch (err) {
    console.error('[Cool Fix] POST Customer Unit Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/customer/services */
const getServices = async (req, res) => {
  try {
    if (!pool) return res.status(200).json({ success: true, services: [] });
    const result = await pool.query(`
      SELECT service_id, service_name, description, price, duration, service_type
        FROM payables.service
        WHERE ${NOT_DELETED}
        ORDER BY service_id`);
    const services = (result.rows || []).map((row) => ({
      service_id: row.service_id,
      service_name: row.service_name,
      description: row.description || 'Professional aircon service.',
      price: Number(row.price || 0),
      unit_label: 'per unit',
      duration_mins: parseInt(String(row.duration || '').replace(/[^0-9]/g, ''), 10) || 60,
      category: row.service_type || 'Maintenance',
      icon: 'snowflake',
      includes: ['General inspection', 'Filter cleaning', 'Performance check', 'Service report'],
    }));
    res.status(200).json({ success: true, services });
  } catch (err) {
    console.error('[Cool Fix] GET Customer Services Error:', err.message);
    res.status(500).json({ success: false, message: err.message, services: [] });
  }
};

/* ---------- GET /api/customer/subscriptions?customerId=# ---------- */
const getMySubscriptions = async (req, res) => {
  try {
    const customerId = parseInt(req.query.customerId, 10) || 1;

    const result = await pool.query(`
        SELECT
          cs.subscriptionid                              AS package_id,
          s.name                                         AS package_name,
          COALESCE(s.description, '')                    AS description,
          sv.service_name                                AS service_name,
          COALESCE(sv.price, 0)                          AS visit_price,
          COALESCE(s."numberOfBookings", 0)                AS visits_included,
          COALESCE(cs."remainingBookings", 0)              AS remaining_bookings,
          to_char(cs."nextBookingDate", 'YYYY-MM-DD')      AS next_booking_date,
          to_char(cs."dateStarted", 'YYYY-MM-DD')          AS date_started
        FROM payables."currentSubscribers" cs
        JOIN payables.subscription s  ON cs.subscriptionid = s."subscriptionID"
        LEFT JOIN payables.service sv ON s."recurringServiceID" = sv.service_id
        WHERE cs."customerID" = $1
        ORDER BY cs.subscriptionid
      `, [customerId]);

    const subscriptions = (result.rows || []).map((row) => ({
      package_id: row.package_id,
      package_name: row.package_name,
      description: row.description,
      // plan value = per-visit price of the recurring service × visits included
      price: Number(row.visit_price || 0) * Number(row.visits_included || 0),
      services_included: row.service_name ? [row.service_name] : [],
      status: Number(row.remaining_bookings) > 0 ? 'Active' : 'Completed',
      remaining_bookings: row.remaining_bookings,
      visits_included: row.visits_included,
      next_booking_date: row.next_booking_date,
      date_started: row.date_started,
    }));

    return res.status(200).json({ success: true, subscriptions, count: subscriptions.length });
  } catch (err) {
    console.error('[Cool Fix] GET Customer Subscriptions Error:', err.message);
    return res.status(500).json({ success: false, message: err.message, subscriptions: [] });
  }
};

/* ---------- GET /api/customer/plans ---------- */
const getPlans = async (req, res) => {
  try {
    if (!pool) return res.status(200).json({ success: true, plans: [] });
    const result = await pool.query(`
      SELECT
        s."subscriptionID"          AS plan_id,
        s.name                    AS plan_name,
        COALESCE(s.description, '') AS description,
        s."recurringServiceID"      AS recurring_service_id,
        sv.service_name           AS service_name,
        COALESCE(sv.price, 0)     AS visit_price,
        COALESCE(s."timeTillNextService", 90) AS interval_days,
        COALESCE(s."numberOfBookings", 0)     AS visits_included
      FROM payables.subscription s
      LEFT JOIN payables.service sv ON sv.service_id = s."recurringServiceID"
      ORDER BY s."subscriptionID"`);
    const plans = (result.rows || []).map((row) => {
      const visitPrice = Number(row.visit_price || 0);
      const visits = Number(row.visits_included || 0);
      const interval = Number(row.interval_days || 90);
      return {
        plan_id: row.plan_id,
        plan_name: row.plan_name,
        description: row.description,
        service_name: row.service_name || 'Aircon Service',
        price: visitPrice * visits,
        price_per_visit: visitPrice,
        visits_included: visits,
        interval_days: interval,
        interval_label: `Every ${interval} days`,
      };
    });
    return res.status(200).json({ success: true, plans, count: plans.length });
  } catch (err) {
    console.error('[Cool Fix] GET Plans Error:', err.message);
    return res.status(500).json({ success: false, message: err.message, plans: [] });
  }
};
/* GET /api/customer/promotions */
const getPromotions = async (req, res) => {
  try {
    if (!pool) return res.status(200).json({ success: true, promotions: [] });
    const result = await pool.query(`
      SELECT promo_id, promo_name,
             to_char(promo_end, 'YYYY-MM-DD') AS promo_end,
             description, "promoCode" AS "promoCode", discount
        FROM payables.promotions
       WHERE ${NOT_DELETED}
         AND (promo_end IS NULL OR promo_end >= ${TODAY})`);
    const promotions = (result.rows || []).map((row) => {
      const d = Number(row.discount || 0);
      const isPercent = d > 0 && d < 1; // 0.15 = 15% off, 10 = $10 off
      return {
        promo_id: row.promo_id,
        code: String(row.promoCode || '').trim().toUpperCase(),
        title: row.promo_name,
        description: row.description || '',
        discount_type: isPercent ? 'percent' : 'fixed',
        discount_value: isPercent ? Math.round(d * 100) : d,
        valid_until: row.promo_end || null,
      };
    });
    res.status(200).json({ success: true, promotions });
  } catch (err) {
    console.error('[Cool Fix] GET Customer Promotions Error:', err.message);
    res.status(500).json({ success: false, message: err.message, promotions: [] });
  }
};


//get the other addresses=================================
const getOtherAddresses = async(req,res)=>{
  const customerId = req.query.customerId
  console.log(customerId)
   const result = await pool.query(`
        SELECT *, "address_ID" AS "address_ID", "customer_ID" AS "customer_ID"
        FROM user3."customerAddresses"
        WHERE "customer_ID" = $1
      `, [customerId]);

      console.log(result.rows)
      res.status(200).json({
      success: true,
      addresses: result.rows,
    });
}

const updateOtherAddress = async (req, res) => {
        const{input, address_ID} = req.body;
     console.log(input)
          console.log(address_ID)
      const result = await pool.query(`
          update user3."customerAddresses"
            set customer_address = $1
            where
            "address_ID" = $2
          `, [input, address_ID]);
      res.status(200).json({ success: true });
};

const makeNewExtraAddress =async(req,res)=>{
     const{input, id} = req.body;
     console.log(input)
          console.log(id)
      const result = await pool.query(`insert into user3."customerAddresses" ("customer_ID", customer_address) values
            ($1, $2)
          `, [id, input]);
      res.status(201).json({ success: true });
}

/* GET /api/customer/addresses?customerId=# */
const getAddresses = async (req, res) => {
  try {
    if (!pool) return res.status(200).json({ success: true, addresses: [] });
    const customer = await resolveCustomer(pool, parseInt(req.query.customerId, 10) || 1);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });
    res.status(200).json({
      success: true,
      addresses: [{ address_ID: 1, label: 'Home', line: customer.customer_address || 'Address on file', postal: '', isDefault: true }],
    });
  } catch (err) {
    console.error('[Cool Fix] GET Customer Addresses Error:', err.message);
    res.status(500).json({ success: false, message: err.message, addresses: [] });
  }
};

/* POST /api/customer/bookings?customerId=# */
const createBooking = async (req, res) => {
//i love coding, im having alot of fun doing this. im gonna love my job as a full stack developer / programmer in the future


    try {
  console.log("Booking request body:", req.body);
//console.log("Estimated cost:", req.body.estimatedTotalCost);
//console.log("Estimated time:", req.body.estimatedTotalTime);
/**
 * console.log("Booking values:", {
    numberOfUnits,
    time,
    comments,
    estimatedtotalcost,
    estimatedtotaltime
});
 */


        //Extract data from the request
        const { customer_ID, //always have this
            //service id? nah we need junction table
            numberOfUnits,
                date, 
                time, 
                location ,
                comments,
                //promocode cannot really, its a frontend calculation thing
                estimatedtotalcost, 
                estimatedtotaltime,services} = req.body; //these things take name from frontend 
                /**
                 * console.log("Required booking fields:", {
    customer_ID,
    date,
    time,
    location
});
        if (!customer_ID || !date || !time || !location) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide customer_ID, date, time, and location.' 
            });
        }
dfssd
                 */


        // technician_ID is set to NULL until assigned by Admin
        const result = await pool.query(`
                INSERT INTO "new_jobBooking"."Booking" ("customer_ID",
                                                         "numberOfUnits",
                                                         date,
                                                          timing,
                                                           location,
                                                           comments,
                                                           "estimateTotalTime_minutes",
                                                           "estimateTotalCost",
                                                        "technician_ID",
                                                           "isFollowup",
                                                            status,
                                                            time,"servicesBooked")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, false, 'pending', '12:00:00', $9)
                RETURNING "booking_ID" AS "booking_ID"
            `, [customer_ID, numberOfUnits, date, time, location, comments,
                estimatedtotaltime, estimatedtotalcost, services]);
            //time (from frontend) goes into the timing column, the time column is fixed at 12:00:00

        const newBookingId = result.rows[0].booking_ID;

        res.status(201).json({
            success: true,
            message: 'Booking created successfully!',
            booking_ID: newBookingId
        });

    } catch (err) {
        console.error('Error creating booking:', err);
        res.status(500).json({ success: false, error: err.message });
    }



  /**the ai slop original
   * 
   * 
   * 
   * try {
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });
    const customer = await resolveCustomer(pool, parseInt(req.query.customerId, 10) || 1);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });

    const { serviceIds, serviceId, numberOfUnits, date, time, location, comments, promoCode } = req.body || {};

    // Accept an array of services OR a single id (backwards compatible)
    const ids = Array.isArray(serviceIds)
      ? serviceIds.map(Number).filter(Boolean)
      : (serviceId ? [Number(serviceId)] : []);
    const units = Math.min(Math.max(parseInt(numberOfUnits, 10) || 1, 1), 10);

    if (ids.length === 0 || !date || !time || !location)
      return res.status(400).json({ success: false, message: 'serviceIds, date, time and location are required' });

    // ---- Normalize date to strict YYYY-MM-DD (SQL-safe for DATE/DATETIME columns) ----
    const normalizeDate = (value) => {
      const s = String(value || '').trim();
      // Already ISO (e.g. "2026-10-25" or "2026-10-25T00:00:00.000Z"): take the date part
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      // Singapore-style DD/MM/YYYY (e.g. "25/10/2026")
      const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dmy) {
        const dd = parseInt(dmy[1], 10), mm = parseInt(dmy[2], 10);
        if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
          return `${dmy[3]}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        }
        return null;
      }
      // Last resort: let JS parse ("Oct 25 2026", etc.)
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      return null;
    };

    // ---- Normalize time to 24h HH:MM:SS (SQL-safe for TIME columns) ----
    const normalizeTime = (value) => {
      const s = String(value || '').trim().toLowerCase();
      // Some pickers send a period label ("Morning") instead of a clock time — map it
      if (/\bmorning\b/.test(s)) return '09:00:00';
      if (/\bnoon\b/.test(s)) return '12:00:00';
      if (/\bafternoon\b/.test(s)) return '14:00:00';
      if (/\bevening\b/.test(s)) return '18:00:00';
      if (/\bnight\b/.test(s)) return '20:00:00';
      // "9:00 am", "09:00 pm", "9:00:30 am"
      let m = s.match(/^(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(am|pm)\.?$/);
      if (m) {
        let h = parseInt(m[1], 10) % 12;
        if (m[4] === 'pm') h += 12;
        return `${String(h).padStart(2, '0')}:${m[2]}:${m[3] || '00'}`;
      }
      // "09:00", "9:00", "09:00:00"
      m = s.match(/^(\d{1,2})[:.](\d{2})(?::(\d{2}))?$/);
      if (m) {
        const h = parseInt(m[1], 10);
        if (h > 23) return null;
        return `${String(h).padStart(2, '0')}:${m[2]}:${m[3] || '00'}`;
      }
      // "0900" or "090000"
      m = s.match(/^(\d{2})(\d{2})(\d{2})?$/);
      if (m) {
        const h = parseInt(m[1], 10), mm = parseInt(m[2], 10);
        if (h > 23 || mm > 59) return null;
        return `${m[1]}:${m[2]}:${m[3] || '00'}`;
      }
      return null;
    };
// this is customer controller, this goes to db instead of booking controller
    const cleanDate = normalizeDate(date);
    const cleanTime = normalizeTime(time);
    if (!cleanDate)
      return res.status(400).json({ success: false, message: `Invalid date received: "${date}". Expected e.g. 2026-10-25.` });
    if (!cleanTime)
      return res.status(400).json({ success: false, message: `Invalid time received: "${time}". Expected e.g. "9:00 AM" or "09:00".` });
    console.log(`[Cool Fix] Booking date/time normalized: "${date}" -> ${cleanDate}, "${time}" -> ${cleanTime}`);

    // Unit count goes into comments so the technician sees it on the job
    const finalComments = units > 1
      ? `${comments ? String(comments) + ' | ' : ''}[${units} aircon units]`
      : (comments ? String(comments) : null);

    const inserted = await pool.request()
      .input('cid', sql.Int, customer.customer_ID)
      .input('date', sql.VarChar(10), cleanDate)
      .input('time', sql.VarChar(8), cleanTime)
      .input('location', sql.VarChar(100), String(location))
      .input('status', sql.VarChar(100), 'Pending')
      .input('comments', sql.VarChar(500), finalComments)
      .query(`INSERT INTO [new_jobBooking].[Booking] (customer_ID, [date], [time], location, [status], comments)
              OUTPUT INSERTED.booking_ID VALUES (@cid, @date, @time, @location, @status, @comments)`);
    const bookingId = inserted.rows[0].booking_ID;

    // One job per service per unit → dashboard amount (SUM of job prices) matches the frontend estimate
    let jobCount = 0;
    try {
      for (const sid of ids) {
        for (let u = 0; u < units; u++) {
          const jobRes = await pool.request()
            .input('status', sql.VarChar(100), 'Pending')
            .input('serviceId', sql.Int, sid)
            .query(`INSERT INTO [new_jobBooking].[job] (job_status, isFollowup, serviceID)
                    OUTPUT INSERTED.job_ID VALUES (@status, 0, @serviceId)`);
          await pool.request().input('jobId', sql.Int, jobRes.rows[0].job_ID).input('bookingId', sql.Int, bookingId)
            .query(`INSERT INTO [new_jobBooking].[work] (job_ID, booking_ID) VALUES (@jobId, @bookingId)`);
          jobCount++;
        }
      }
    } catch (linkErr) {
      console.error('[Cool Fix] job/work link skipped:', linkErr.message);
    }

    if (promoCode) {
      try {
        const promoRes = await pool.request().input('code', sql.VarChar(255), String(promoCode).toUpperCase())
          .query(`SELECT promo_id FROM [payables].[promotions] WHERE promoCode = code`);
        if (promoRes.rows.length) {
          await pool.request()
            .input('customerID', sql.Int, customer.customer_ID)
            .input('promoID', sql.Int, promoRes.rows[0].promo_id)
            .input('serviceID', sql.Int, ids[0])
            .query(`INSERT INTO [payables].[purchases] (customerID, promoID, serviceID) VALUES (@customerID, @promoID, @serviceID)`);
        }
      } catch (promoErr) { console.error('[Cool Fix] promo log skipped:', promoErr.message); }
    }

    return res.status(201).json({ success: true, booking_ID: bookingId, jobs_created: jobCount,
      reference: `BK-${new Date().getFullYear()}-${String(bookingId).padStart(3, '0')}` });
  } catch (err) {
    console.error('[Cool Fix] POST Customer Booking Error:', err.message,
      '| received date =', req.body && req.body.date, '| received time =', req.body && req.body.time);
    res.status(500).json({ success: false, message: err.message });
  }
   * 
   * 
   */
  
};

/* ---------- PUT /api/customer/bookings/:bookingId/cancel?customerId=# ---------- */
const cancelBooking = async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    const customer = await resolveCustomer(pool, parseInt(req.query.customerId, 10) || 1);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });

    const bookingId = parseInt(req.params.bookingId, 10);
    if (!bookingId) return res.status(400).json({ success: false, message: 'Invalid booking id' });

    // Ownership check: the booking must belong to THIS customer
    const check = await pool.query(
      `SELECT "booking_ID", status FROM "new_jobBooking"."Booking"
              WHERE "booking_ID" = $1 AND "customer_ID" = $2`, [bookingId, customer.customer_ID]);
    const booking = check.rows[0];
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Only open bookings can be cancelled (can't cancel once work started/done)
    const cancellable = ['pending', 'confirmed', 'scheduled', 'assigned'];
    if (!cancellable.includes(String(booking.status || '').toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `A ${booking.status} booking can no longer be cancelled. Contact support if there's a problem.`,
      });
    }

    await pool.query(
      `UPDATE "new_jobBooking"."Booking" SET status = 'Cancelled' WHERE "booking_ID" = $1`, [bookingId]);

    res.status(200).json({ success: true, message: 'Booking cancelled.' });
  } catch (err) {
    console.error('[Cool Fix] PUT Cancel Booking Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================================
 * CUSTOMER PROFILE — GET + PUT /api/customer/profile?customerId=<id>
 * Real tables: [user3].[newCustomer] + [user3].[topUser]
 * Body (all optional, at least one): { name, email, phone, address }
 * ========================================================================== */
const shapeProfile = (row) => ({
  // both naming styles included so any page can read what it expects
  customer_id: row.customer_ID,
  customer_ID: row.customer_ID,
  username: row.username || '',
  name: row.customer_name || row.username || '',
  customer_name: row.customer_name || row.username || '',
  email: row.email || '',
  phone: row.phoneNumber || '',
  phoneNumber: row.phoneNumber || '',
  address: row.customer_address || '',
  customer_address: row.customer_address || '',
  joined: row.joined || null,
  loyalty_points: Number(row.loyaltyPoints || 0),
  total_spent: Number(row.totalSpent || 0),
});

/* GET /api/customer/profile?customerId=# */
const getProfile = async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'Database not connected' });
    const rawId = parseInt(req.query.customerId, 10) || parseInt(req.query.customer_id, 10) || 0;
    const customer = await resolveCustomer(pool, rawId);
    if (!customer) return res.status(404).json({ success: false, message: `Customer ${req.query.customerId || ''} not found` });
    return res.status(200).json({ success: true, profile: shapeProfile(customer) });
  } catch (err) {
    console.error('[Cool Fix] GET Customer Profile Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* PUT /api/customer/profile?customerId=# */
const updateProfile = async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'Database not connected' });

    const rawId = parseInt(req.query.customerId, 10)
      || parseInt((req.body || {}).customerId, 10)
      || parseInt((req.body || {}).customer_id, 10)
      || 0;
    const customer = await resolveCustomer(pool, rawId);
    if (!customer) return res.status(404).json({ success: false, message: `Customer ${req.query.customerId || ''} not found` });

    const body = req.body || {};
    const pick = (...vals) => {
      for (const v of vals) {
        if (typeof v === 'string' && v.trim() !== '') return v.trim();
      }
      return undefined;
    };
    const name = pick(body.name, body.customer_name);
    const email = pick(body.email);
    const phone = pick(body.phone, body.phoneNumber);
    const address = pick(body.address, body.customer_address);

    // ---- Validations ----
    if (name !== undefined && name.length > 45)
      return res.status(400).json({ success: false, message: 'Name is too long (max 45 characters)' });
    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
      if (email.length > 100)
        return res.status(400).json({ success: false, message: 'Email is too long (max 100 characters)' });
    }
    if (phone !== undefined && !/^[0-9+\-\s()]{6,20}$/.test(phone))
      return res.status(400).json({ success: false, message: 'Please enter a valid phone number' });
    if (address !== undefined && address.length > 200)
      return res.status(400).json({ success: false, message: 'Address is too long (max 200 characters)' });
    if (name === undefined && email === undefined && phone === undefined && address === undefined)
      return res.status(400).json({ success: false, message: 'Nothing to update' });

    // ---- user_ID of this customer (needed for topUser update + duplicate check) ----
    const ownerRes = await pool.query(
      `SELECT "user_ID" FROM user3."newCustomer" WHERE "customer_ID" = $1`, [customer.customer_ID]);
    const userId = ownerRes.rows.length ? ownerRes.rows[0].user_ID : null;

    // ---- Duplicate email check (another account already uses it) ----
    if (email !== undefined && userId != null) {
      const dup = await pool.query(
        `SELECT "user_ID" FROM user3."topUser" WHERE email = $1 AND "user_ID" <> $2`, [email, userId]);
      if (dup.rows.length)
        return res.status(409).json({ success: false, message: 'That email is already used by another account' });
    }

    // ---- UPDATE [user3].[topUser]: email + phone ----
    if (userId != null && (email !== undefined || phone !== undefined)) {
      const nextEmail = email !== undefined ? email : (customer.email || '');
      const nextPhone = phone !== undefined ? phone : (customer.phoneNumber || '');
      await pool.query(
        `UPDATE user3."topUser" SET email = $1, "phoneNumber" = $2 WHERE "user_ID" = $3`,
        [nextEmail, nextPhone, userId]);
    }

    // ---- UPDATE [user3].[newCustomer]: name + address ----
    if (name !== undefined || address !== undefined) {
      const nextName = name !== undefined ? name : (customer.customer_name || customer.username || 'Customer');
      const nextAddress = address !== undefined ? address : (customer.customer_address || '');
      await pool.query(
        `UPDATE user3."newCustomer" SET customer_name = $1, customer_address = $2 WHERE "customer_ID" = $3`,
        [nextName, nextAddress, customer.customer_ID]);
    }

    // ---- Re-read and return the fresh profile ----
    const fresh = await resolveCustomer(pool, customer.customer_ID);
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: shapeProfile(fresh || customer),
    });
  } catch (err) {
    console.error('[Cool Fix] PUT Customer Profile Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

//the RR options==========================
const pickRR1 = async (req,res) =>{
  console.log("reached rr1 controller")
    const bookingId = Number(req.params.bookingId);
    const result = await pool.query(`
      UPDATE "new_jobBooking"."Booking"
    SET
    date = "RR1_date",
    timing = "RR1_time",
    "technician_ID" = "RR1_technician",


   status = 'confirmed'

    WHERE "booking_ID" = $1
  `, [bookingId]);
  return res.status(200).json({
      success: true,
      message: "Booking RR1 successfully.",
    });

}

const pickRR2 = async (req,res) =>{
  console.log("reached rr2 controller")
    const bookingId = Number(req.params.bookingId);
    const result = await pool.query(`
      UPDATE "new_jobBooking"."Booking"
    SET
    date = "RR2_date",
    timing = "RR2_time",
    "technician_ID" = "RR2_technician",


   status = 'confirmed'

    WHERE "booking_ID" = $1
  `, [bookingId]);
  return res.status(200).json({
      success: true,
      message: "Booking RR2 successfully.",
    });

}

const pickRR3 = async (req,res) =>{
  console.log("reached rr3 controller")
    const bookingId = Number(req.params.bookingId);
    const result = await pool.query(`
      UPDATE "new_jobBooking"."Booking"
    SET
    date = "RR3_date",
    timing = "RR3_time",
    "technician_ID" = "RR3_technician",


   status = 'confirmed'

    WHERE "booking_ID" = $1
  `, [bookingId]);
  return res.status(200).json({
      success: true,
      message: "Booking RR3 successfully.",
    });

}

//this is stuck as rr1
const cloneBooking= async (req,res) =>{
const { booking, customer_ID } = req.body.bookingId;
const {
  RR1_technician,
  RR1_date,
  RR1_time,
  location,
  numberOfUnits
} = booking;

const id = customer_ID;

console.log({
  customer_ID: id,
  RR1_technician,
  RR1_date,
  RR1_time,
  location,
  numberOfUnits
});

const result = await pool.query(`
 INSERT INTO "new_jobBooking"."Booking"
 (
 "customer_ID",
date,
    timing,
      location,
      comments,
       "technician_ID",
       status,
       time,"numberOfUnits"
 )
 VALUES ($1, $2, $3, $4, 'Assisting another technician, through an RR', $5, 'confirmed', '12:00:00', $6)
 RETURNING "booking_ID" AS "booking_ID"
`, [id, RR1_date, RR1_time, location, RR1_technician, numberOfUnits]);
console.log("finish clone rr1")
return res.status(201).json({ success: true, booking_ID: result.rows[0].booking_ID });
}

//clone rr2
const clone2= async (req,res) =>{
const { booking, customer_ID } = req.body.bookingId;
const {
  RR2_technician,
  RR2_date,
  RR2_time,
  location,
  numberOfUnits
} = booking;

const id = customer_ID;

const result = await pool.query(`
 INSERT INTO "new_jobBooking"."Booking"
 (
 "customer_ID",
date,
    timing,
      location,
      comments,
       "technician_ID",
       status,
       time,"numberOfUnits"
 )
 VALUES ($1, $2, $3, $4, 'Assisting another technician, through an RR', $5, 'confirmed', '12:00:00', $6)
 RETURNING "booking_ID" AS "booking_ID"
`, [id, RR2_date, RR2_time, location, RR2_technician, numberOfUnits]);
console.log("finish clone rr2")
return res.status(201).json({ success: true, booking_ID: result.rows[0].booking_ID });
}

//clone3
const clone3= async (req,res) =>{
const { booking, customer_ID } = req.body.bookingId;
const {
  RR3_technician,
  RR3_date,
  RR3_time,
  location,
  numberOfUnits
} = booking;

const id = customer_ID;

const result = await pool.query(`
 INSERT INTO "new_jobBooking"."Booking"
 (
 "customer_ID",
date,
    timing,
      location,
      comments,
       "technician_ID",
       status,
       time,"numberOfUnits"
 )
 VALUES ($1, $2, $3, $4, 'Assisting another technician, through an RR', $5, 'confirmed', '12:00:00', $6)
 RETURNING "booking_ID" AS "booking_ID"
`, [id, RR3_date, RR3_time, location, RR3_technician, numberOfUnits]);
console.log("finish clone rr3")
return res.status(201).json({ success: true, booking_ID: result.rows[0].booking_ID });
}


              //subcriptions==================
        const purchaseSubscription = async (req, res) => {
  const { customerID, subscriptionID } = req.body;

  console.log("Received purchase request:", req.body);

  if (!customerID || !subscriptionID) {
    return res.status(400).json({
      success: false,
      message: "customerID and subscriptionID are required."
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Retrieve subscription plan and recurring service
    const planResult = await client.query(`
        SELECT
          s."subscriptionID" AS "subscriptionID",
          s.name,
          s."recurringServiceID" AS "recurringServiceID",
          s."timeTillNextService" AS "timeTillNextService",
          s."numberOfBookings" AS "numberOfBookings",
          sv.service_name
        FROM payables.subscription s
        LEFT JOIN payables.service sv
          ON s."recurringServiceID" = sv.service_id
        WHERE s."subscriptionID" = $1
      `, [subscriptionID]);

    if (planResult.rows.length === 0) {
      throw new Error("Subscription plan not found.");
    }

    const plan = planResult.rows[0];

    if (
      !plan.numberOfBookings ||
      plan.numberOfBookings <= 0 ||
      !plan.timeTillNextService ||
      plan.timeTillNextService <= 0 ||
      !plan.service_name
    ) {
      throw new Error("Invalid subscription plan or recurring service.");
    }

    // 2. Retrieve customer's main address
    const customerResult = await client.query(`
        SELECT "customer_ID" AS "customer_ID", customer_address
        FROM user3."newCustomer"
        WHERE "customer_ID" = $1
      `, [customerID]);

    if (customerResult.rows.length === 0) {
      throw new Error("Customer not found.");
    }

    const customer = customerResult.rows[0];

    // 3. Get today's date from the database (Singapore time)
    const dateResult = await client.query(`
        SELECT ${TODAY} AS today
      `);

    const today = dateResult.rows[0].today;

    // 4. Calculate subscription dates
    const dateStarted = today;

    const bookings = [];

    for (let i = 1; i <= plan.numberOfBookings; i++) {
      const bookingDate = new Date(today);

      bookingDate.setDate(
        bookingDate.getDate() + (plan.timeTillNextService * i)
      );

      // Format date as YYYY-MM-DD
      const formattedDate = [
        bookingDate.getFullYear(),
        String(bookingDate.getMonth() + 1).padStart(2, "0"),
        String(bookingDate.getDate()).padStart(2, "0")
      ].join("-");

      // Randomly assign Morning or Afternoon
      const timing = Math.random() < 0.5
        ? "Morning"
        : "Afternoon";

      const actualTime = timing === "Morning"
        ? "09:00"
        : "14:00";

      bookings.push({
        date: formattedDate,
        timing,
        actualTime
      });
    }

    // 5. Register customer as subscriber
    await client.query(`
        INSERT INTO payables."currentSubscribers" (
          "customerID",
          subscriptionid,
          "remainingBookings",
          "dateStarted",
          "nextBookingDate"
        )
        VALUES ($1, $2, $3, $4, $5)
      `, [customerID, subscriptionID, plan.numberOfBookings, dateStarted, bookings[0].date]);

    // 6. Generate future bookings
    const createdBookings = [];

    for (const booking of bookings) {
      const result = await client.query(`
          INSERT INTO "new_jobBooking"."Booking" (
            "customer_ID",
            "technician_ID",
            date,
            time,
            "isFollowup",
            location,
            status,
            timing,
            "servicesBooked"
          )
          VALUES ($1, NULL, $2, $3, false, $4, 'Pending', $5, $6)
          RETURNING "booking_ID" AS "booking_ID"
        `, [customerID, booking.date, booking.actualTime, customer.customer_address, booking.timing, plan.service_name]);

      createdBookings.push({
        booking_ID: result.rows[0].booking_ID,
        date: booking.date,
        timing: booking.timing,
        service: plan.service_name
      });
    }

    // 7. Commit transaction
    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: "Subscription purchased and future bookings created successfully.",
      subscription: {
        customerID,
        subscriptionID,
        remainingBookings: plan.numberOfBookings,
        dateStarted,
        nextBookingDate: bookings[0].date
      },
      bookings: createdBookings
    });

  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error("Subscription rollback error:", rollbackErr);
    }

    console.error("Purchase subscription error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to purchase subscription."
    });
  } finally {
    client.release();
  }
};

module.exports = {clone2,clone3,cloneBooking, pickRR1,pickRR2,pickRR3, chooseRROption, getDashboard, getMyBookings, rateBooking, getMyUnits, registerUnit, 
  getServices, getPlans, getMySubscriptions, getPromotions, getAddresses, createBooking, cancelBooking, getProfile,
   updateProfile,getINCOMING,updateIncomingBookingStatus,
  getOtherAddresses,updateOtherAddress ,makeNewExtraAddress,purchaseSubscription};