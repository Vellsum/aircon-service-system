/**
 * Cool Fix - Customer Portal Controller
 * Local/Azure schema: [user3], [new_jobBooking], [inventory], [payables]
 */
const { poolPromise, sql } = require('../config/db');

const UPCOMING_STATUSES = ['pending', 'assigned', 'in progress', 'scheduled', 'confirmed'];
const SERVICE_INTERVAL_DAYS = 90;
const statusIn = UPCOMING_STATUSES.map((s) => `'${s}'`).join(', ');

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
    SELECT nc.customer_ID, nc.customer_name, nc.loyaltyPoints, nc.customer_address, nc.totalSpent,
           tu.email, tu.phoneNumber, tu.username, tu.joined
      FROM [user3].[newCustomer] nc
      LEFT JOIN [user3].[topUser] tu ON tu.user_ID = nc.user_ID`;
  const byCustomer = await pool.request().input('cid', sql.Int, Number(id)).query(
    `${base} WHERE nc.customer_ID = @cid`);
  if (byCustomer.recordset.length) return byCustomer.recordset[0];
  const byUser = await pool.request().input('uid', sql.Int, Number(id)).query(
    `${base} WHERE nc.user_ID = @uid`);
  return byUser.recordset[0] || null;
}

const bookingSelect = (top = 0) => `
  SELECT ${top ? `TOP (${top})` : ''}
    b.booking_ID,
    CONVERT(VARCHAR(10), b.[date], 120) AS cleanDate,
    b.[time] AS rawTime,
    b.[status], b.location, b.comments,
    t.technician_name,
    ISNULL(t.technician_rating, 5) AS technician_rating,
    ISNULL(t.jobsDone, 0) AS jobsDone,
    svc.service_name, ISNULL(svc.amount, 0) AS amount,
    rep.report_summary
  FROM [new_jobBooking].[Booking] b
  LEFT JOIN [user3].[technician] t ON t.technician_ID = b.technician_ID
  OUTER APPLY (
    SELECT STRING_AGG(ISNULL(s.service_name, 'Aircon Service'), ', ') AS service_name,
           SUM(ISNULL(s.price, 0)) AS amount
      FROM [new_jobBooking].[work] w
      JOIN [new_jobBooking].[job] j ON j.job_ID = w.job_ID
      LEFT JOIN [payables].[service] s ON s.service_id = j.serviceID
     WHERE w.booking_ID = b.booking_ID
  ) svc
  OUTER APPLY (
    SELECT STRING_AGG(COALESCE(sr.findings, sr.description), ' ') AS report_summary
      FROM [new_jobBooking].[work] w
      JOIN [new_jobBooking].[job] j ON j.job_ID = w.job_ID
      LEFT JOIN [new_jobBooking].[serviceReport] sr ON sr.reportID = j.serviceReport
     WHERE w.booking_ID = b.booking_ID
  ) rep`;

function shapeBooking(row, customerUnits = []) {
  return {
    booking_ID: row.booking_ID,
    date: row.cleanDate,
    time: formatTime(row.rawTime),
    status: row.status || 'Pending',
    location: row.location,
    notes: row.comments,
    service_name: row.service_name || 'Aircon Service',
    amount: Number(row.amount || 0),
    unit_ids: customerUnits.map((u) => u.installed_ID),
    units: customerUnits.map((u) => u.nickname),
    technician: row.technician_name
      ? { name: row.technician_name, rating: Number(row.technician_rating), jobs_done: Number(row.jobsDone) }
      : null,
    report: row.report_summary ? { summary: row.report_summary } : null,
  };
}

async function getCustomerUnits(pool, customerId) {
  const result = await pool.request().input('cid', sql.Int, customerId).query(`
    SELECT a.aircon_ID, a.aircon_make, a.aircon_model, a.aircon_type,
           a.aircon_serialNumber,
           CONVERT(VARCHAR(10), ls.last_service, 120) AS last_service,
           sc.service_count
      FROM [inventory].[installedAircons] ia
      JOIN [inventory].[aircon] a ON a.aircon_ID = ia.airconID
      OUTER APPLY (SELECT MAX(b.[date]) AS last_service
                     FROM [new_jobBooking].[Booking] b
                    WHERE b.customer_ID = ia.customerID AND LOWER(b.[status]) = 'completed') ls
      OUTER APPLY (SELECT COUNT(*) AS service_count
                     FROM [new_jobBooking].[Booking] b2
                    WHERE b2.customer_ID = ia.customerID AND LOWER(b2.[status]) = 'completed') sc
     WHERE ia.customerID = @cid
     ORDER BY a.aircon_ID`);

  return (result.recordset || []).map((row) => {
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

/* GET /api/customer/dashboard?customerId=# */
const getDashboard = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, profile: null, stats: {}, nextBooking: null, recent: [], units: [] });
    const customer = await resolveCustomer(pool, parseInt(req.query.customerId, 10) || 1);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });
    const cid = customer.customer_ID;

    const statsResult = await pool.request().input('cid', sql.Int, cid).query(`
      SELECT SUM(CASE WHEN LOWER([status]) IN (${statusIn}) AND [date] >= CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS upcoming,
             SUM(CASE WHEN LOWER([status]) = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM [new_jobBooking].[Booking] WHERE customer_ID = @cid`);

    const nextResult = await pool.request().input('cid', sql.Int, cid).query(
      `${bookingSelect(1)} WHERE b.customer_ID = @cid AND LOWER(b.[status]) IN (${statusIn})
         AND b.[date] >= CAST(GETDATE() AS DATE) ORDER BY b.[date], b.[time]`);

    const recentResult = await pool.request().input('cid', sql.Int, cid).query(
      `${bookingSelect(4)} WHERE b.customer_ID = @cid
         AND (b.[date] < CAST(GETDATE() AS DATE) OR LOWER(b.[status]) IN ('completed','cancelled'))
         ORDER BY b.[date] DESC, b.[time] DESC`);

    const unitList = await getCustomerUnits(pool, cid);
    const s = statsResult.recordset[0] || {};

    return res.status(200).json({
      success: true,
      profile: { customer_ID: cid, customer_name: customer.customer_name,
            loyalty_points: Number(customer.loyaltyPoints || 0), address: customer.customer_address,
            email: customer.email || null, phone: customer.phoneNumber || null,
            username: customer.username || null, joined: customer.joined || null },
      stats: { upcoming: Number(s.upcoming) || 0, units: unitList.length,
               completed: Number(s.completed) || 0, totalSpend: Number(customer.totalSpent) || 0 },
      nextBooking: nextResult.recordset.length ? shapeBooking(nextResult.recordset[0], unitList) : null,
      recent: (recentResult.recordset || []).map((r) => shapeBooking(r, unitList)),
      units: unitList,
    });
  } catch (err) {
    console.error('[Cool Fix] GET Customer Dashboard Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/customer/bookings?customerId=# */
const getMyBookings = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, bookings: [] });
    const customer = await resolveCustomer(pool, parseInt(req.query.customerId, 10) || 1);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });
    const result = await pool.request().input('cid', sql.Int, customer.customer_ID).query(
      `${bookingSelect()} WHERE b.customer_ID = @cid ORDER BY b.[date] DESC, b.[time] DESC`);
    const unitList = await getCustomerUnits(pool, customer.customer_ID);
    res.status(200).json({ success: true, bookings: (result.recordset || []).map((r) => shapeBooking(r, unitList)) });
  } catch (err) {
    console.error('[Cool Fix] GET Customer Bookings Error:', err.message);
    res.status(500).json({ success: false, message: err.message, bookings: [] });
  }
};

/* GET /api/customer/units?customerId=# */
const getMyUnits = async (req, res) => {
  try {
    const pool = await poolPromise;
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
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });
    const customer = await resolveCustomer(pool, parseInt(req.query.customerId, 10) || 1);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });
    const { brand, model, type, serialNumber } = req.body || {};
    if (!brand && !model) return res.status(400).json({ success: false, message: 'Provide at least a brand or model.' });

    const airconRes = await pool.request()
      .input('make', sql.VarChar(100), brand || 'Unknown')
      .input('model', sql.VarChar(100), model || '')
      .input('type', sql.VarChar(100), type || 'Split')
      .input('serial', sql.VarChar(100), serialNumber || null)
      .query(`INSERT INTO [inventory].[aircon] (aircon_make, aircon_model, aircon_type, aircon_serialNumber, isInstalled)
              OUTPUT INSERTED.aircon_ID VALUES (@make, @model, @type, @serial, 1)`);
    const airconId = airconRes.recordset[0].aircon_ID;
    await pool.request().input('airconId', sql.Int, airconId).input('cid', sql.Int, customer.customer_ID)
      .query(`INSERT INTO [inventory].[installedAircons] (airconID, customerID) VALUES (@airconId, @cid)`);
    res.status(201).json({ success: true, installed_ID: airconId, nickname: [brand, model].filter(Boolean).join(' ') });
  } catch (err) {
    console.error('[Cool Fix] POST Customer Unit Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/customer/services */
const getServices = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, services: [] });
    const result = await pool.request().query(`
      SELECT service_id, service_name, description, price, duration, service_type
        FROM [payables].[service]
        WHERE (isdeleted IS NULL OR LOWER(isdeleted) IN ('0','false','no'))
        ORDER BY service_id`);
    const services = (result.recordset || []).map((row) => ({
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

/* ---------- GET /api/customer/subscriptions?customerId=# ----------
 * 6 Oct 2026 — "Subscriptions" = packages the customer purchased
 * (payables.purchases with packageID set), joined with payables.packages.
 * Includes the services covered by each package (via payables.serviceList).
 * --------------------------------------------------------------------------- */
const getMySubscriptions = async (req, res) => {
  try {
    const customerId = parseInt(req.query.customerId, 10) || 1;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('custId', sql.Int, customerId)
      .query(`
        SELECT
          cs.subscriptionid                              AS package_id,
          s.name                                         AS package_name,
          ISNULL(s.description, '')                      AS description,
          sv.service_name                                AS service_name,
          ISNULL(sv.price, 0)                            AS visit_price,
          ISNULL(s.numberOfBookings, 0)                  AS visits_included,
          ISNULL(cs.remainingBookings, 0)                AS remaining_bookings,
          CONVERT(VARCHAR(10), cs.nextBookingDate, 120)  AS next_booking_date,
          CONVERT(VARCHAR(10), cs.dateStarted, 120)      AS date_started
        FROM [payables].[currentSubscribers] cs
        JOIN [payables].[subscription] s  ON cs.subscriptionid = s.subscriptionID
        LEFT JOIN [payables].[service] sv ON s.recurringServiceID = sv.service_id
        WHERE cs.customerID = @custId
        ORDER BY cs.subscriptionid
      `);

    const subscriptions = (result.recordset || []).map((row) => ({
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

/* ---------- GET /api/customer/plans ----------
 * Full subscription plan catalog from payables.subscription,
 * joined with payables.service for the recurring service each plan covers.
 * Powers the Service Catalog "Maintenance plans" section.
 * --------------------------------------------- */
const getPlans = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, plans: [] });
    const result = await pool.request().query(`
      SELECT
        s.subscriptionID          AS plan_id,
        s.name                    AS plan_name,
        ISNULL(s.description, '') AS description,
        s.recurringServiceID      AS recurring_service_id,
        sv.service_name           AS service_name,
        ISNULL(sv.price, 0)       AS visit_price,
        ISNULL(s.timeTillNextService, 90) AS interval_days,
        ISNULL(s.numberOfBookings, 0)     AS visits_included
      FROM [payables].[subscription] s
      LEFT JOIN [payables].[service] sv ON sv.service_id = s.recurringServiceID
      ORDER BY s.subscriptionID`);
    const plans = (result.recordset || []).map((row) => {
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
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, promotions: [] });
    const result = await pool.request().query(`
      SELECT promo_id, promo_name,
             CONVERT(VARCHAR(10), promo_end, 120) AS promo_end,
             description, promoCode, discount
        FROM [payables].[promotions]
       WHERE (isdeleted IS NULL OR LOWER(isdeleted) IN ('0','false','no'))
         AND (promo_end IS NULL OR promo_end >= CAST(GETDATE() AS DATE))`);
    const promotions = (result.recordset || []).map((row) => {
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

/* GET /api/customer/addresses?customerId=# */
const getAddresses = async (req, res) => {
  try {
    const pool = await poolPromise;
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
  try {
    const pool = await poolPromise;
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

    // Unit count goes into comments so the technician sees it on the job
    const finalComments = units > 1
      ? `${comments ? String(comments) + ' | ' : ''}[${units} aircon units]`
      : (comments ? String(comments) : null);

    const inserted = await pool.request()
      .input('cid', sql.Int, customer.customer_ID)
      .input('date', sql.VarChar(10), String(date))
      .input('time', sql.VarChar(20), String(time))
      .input('location', sql.VarChar(100), String(location))
      .input('status', sql.VarChar(100), 'Pending')
      .input('comments', sql.VarChar(500), finalComments)
      .query(`INSERT INTO [new_jobBooking].[Booking] (customer_ID, [date], [time], location, [status], comments)
              OUTPUT INSERTED.booking_ID VALUES (@cid, @date, @time, @location, @status, @comments)`);
    const bookingId = inserted.recordset[0].booking_ID;

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
          await pool.request().input('jobId', sql.Int, jobRes.recordset[0].job_ID).input('bookingId', sql.Int, bookingId)
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
          .query(`SELECT promo_id FROM [payables].[promotions] WHERE promoCode = @code`);
        if (promoRes.recordset.length) {
          await pool.request()
            .input('customerID', sql.Int, customer.customer_ID)
            .input('promoID', sql.Int, promoRes.recordset[0].promo_id)
            .input('serviceID', sql.Int, ids[0])
            .query(`INSERT INTO [payables].[purchases] (customerID, promoID, serviceID) VALUES (@customerID, @promoID, @serviceID)`);
        }
      } catch (promoErr) { console.error('[Cool Fix] promo log skipped:', promoErr.message); }
    }

    return res.status(201).json({ success: true, booking_ID: bookingId, jobs_created: jobCount,
      reference: `BK-${new Date().getFullYear()}-${String(bookingId).padStart(3, '0')}` });
  } catch (err) {
    console.error('[Cool Fix] POST Customer Booking Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------- PUT /api/customer/bookings/:bookingId/cancel?customerId=# ---------- */
const cancelBooking = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    const customer = await resolveCustomer(pool, parseInt(req.query.customerId, 10) || 1);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });

    const bookingId = parseInt(req.params.bookingId, 10);
    if (!bookingId) return res.status(400).json({ success: false, message: 'Invalid booking id' });

    // Ownership check: the booking must belong to THIS customer
    const check = await pool.request()
      .input('bid', sql.Int, bookingId)
      .input('cid', sql.Int, customer.customer_ID)
      .query(`SELECT booking_ID, [status] FROM [new_jobBooking].[Booking]
              WHERE booking_ID = @bid AND customer_ID = @cid`);
    const booking = check.recordset[0];
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Only open bookings can be cancelled (can't cancel once work started/done)
    const cancellable = ['pending', 'confirmed', 'scheduled', 'assigned'];
    if (!cancellable.includes(String(booking.status || '').toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `A ${booking.status} booking can no longer be cancelled. Contact support if there's a problem.`,
      });
    }

    await pool.request()
      .input('bid', sql.Int, bookingId)
      .query(`UPDATE [new_jobBooking].[Booking] SET [status] = 'Cancelled' WHERE booking_ID = @bid`);

    res.status(200).json({ success: true, message: 'Booking cancelled.' });
  } catch (err) {
    console.error('[Cool Fix] PUT Cancel Booking Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================================
 * CUSTOMER PROFILE — GET + PUT /api/customer/profile?customerId=<id>
 * Real tables (from resolveCustomer): [user3].[newCustomer] + [user3].[topUser]
 *   topUser     -> email, phoneNumber (login identity)
 *   newCustomer -> customer_name, customer_address (display profile)
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
    const pool = await poolPromise;
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
    const pool = await poolPromise;
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
    const ownerRes = await pool.request()
      .input('cid', sql.Int, customer.customer_ID)
      .query(`SELECT user_ID FROM [user3].[newCustomer] WHERE customer_ID = @cid`);
    const userId = ownerRes.recordset.length ? ownerRes.recordset[0].user_ID : null;

    // ---- Duplicate email check (another account already uses it) ----
    if (email !== undefined && userId != null) {
      const dup = await pool.request()
        .input('email', sql.VarChar(100), email)
        .input('uid', sql.Int, userId)
        .query(`SELECT user_ID FROM [user3].[topUser] WHERE email = @email AND user_ID <> @uid`);
      if (dup.recordset.length)
        return res.status(409).json({ success: false, message: 'That email is already used by another account' });
    }

    // ---- UPDATE [user3].[topUser]: email + phone ----
    if (userId != null && (email !== undefined || phone !== undefined)) {
      const nextEmail = email !== undefined ? email : (customer.email || '');
      const nextPhone = phone !== undefined ? phone : (customer.phoneNumber || '');
      await pool.request()
        .input('email', sql.VarChar(100), nextEmail)
        .input('phone', sql.VarChar(45), nextPhone)
        .input('uid', sql.Int, userId)
        .query(`UPDATE [user3].[topUser] SET email = @email, phoneNumber = @phone WHERE user_ID = @uid`);
    }

    // ---- UPDATE [user3].[newCustomer]: name + address ----
    if (name !== undefined || address !== undefined) {
      const nextName = name !== undefined ? name : (customer.customer_name || customer.username || 'Customer');
      const nextAddress = address !== undefined ? address : (customer.customer_address || '');
      await pool.request()
        .input('name', sql.VarChar(45), nextName)
        .input('address', sql.VarChar(200), nextAddress)
        .input('cid', sql.Int, customer.customer_ID)
        .query(`UPDATE [user3].[newCustomer] SET customer_name = @name, customer_address = @address WHERE customer_ID = @cid`);
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

module.exports = { getDashboard, getMyBookings, getMyUnits, registerUnit, getServices, getPlans, getMySubscriptions, getPromotions, getAddresses, createBooking, cancelBooking, getProfile, updateProfile };