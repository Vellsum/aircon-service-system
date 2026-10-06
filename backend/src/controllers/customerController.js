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
  const byCustomer = await pool.request().input('cid', sql.Int, Number(id)).query(
    `SELECT customer_ID, customer_name, loyaltyPoints, customer_address, totalSpent
       FROM [user3].[newCustomer] WHERE customer_ID = @cid`);
  if (byCustomer.recordset.length) return byCustomer.recordset[0];
  const byUser = await pool.request().input('uid', sql.Int, Number(id)).query(
    `SELECT customer_ID, customer_name, loyaltyPoints, customer_address, totalSpent
       FROM [user3].[newCustomer] WHERE user_ID = @uid`);
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
                 loyalty_points: Number(customer.loyaltyPoints || 0), address: customer.customer_address },
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
      SELECT service_id, service_name, description, price, duration
        FROM [payables].[service] WHERE isdeleted = 0 ORDER BY service_id`);
    const services = (result.recordset || []).map((row) => ({
      service_id: row.service_id,
      service_name: row.service_name,
      description: row.description || 'Professional aircon service.',
      price: Number(row.price || 0),
      unit_label: 'per unit',
      duration_mins: parseInt(String(row.duration || '').replace(/[^0-9]/g, ''), 10) || 60,
      icon: 'snowflake',
      includes: ['General inspection', 'Filter cleaning', 'Performance check', 'Service report'],
    }));
    res.status(200).json({ success: true, services });
  } catch (err) {
    console.error('[Cool Fix] GET Customer Services Error:', err.message);
    res.status(500).json({ success: false, message: err.message, services: [] });
  }
};

/* GET /api/customer/promotions */
const getPromotions = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, promotions: [] });
    const result = await pool.request().query(`
      SELECT promo_id, promo_name, promo_end, description, promoCode, discount
        FROM [payables].[promotions]
       WHERE (isdeleted IS NULL OR LOWER(isdeleted) IN ('0','false','no'))
         AND (promo_end IS NULL OR promo_end >= CAST(GETDATE() AS DATE))`);
    const promotions = (result.recordset || []).map((row) => {
      const d = Number(row.discount || 0);
      const isPercent = d > 0 && d < 1; // 0.15 = 15% off, 10 = $10 off
      return {
        code: String(row.promoCode || '').trim().toUpperCase(),
        title: row.promo_name,
        description: row.description || '',
        discount_type: isPercent ? 'percent' : 'fixed',
        discount_value: isPercent ? Math.round(d * 100) : d,
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

    const { serviceId, date, time, location, comments, promoCode } = req.body || {};
    if (!serviceId || !date || !time || !location)
      return res.status(400).json({ success: false, message: 'serviceId, date, time and location are required' });

    const inserted = await pool.request()
      .input('cid', sql.Int, customer.customer_ID)
      .input('date', sql.VarChar(10), String(date))
      .input('time', sql.VarChar(20), String(time))
      .input('location', sql.VarChar(100), String(location))
      .input('status', sql.VarChar(100), 'Pending')
      .input('comments', sql.VarChar(500), comments ? String(comments) : null)
      .query(`INSERT INTO [new_jobBooking].[Booking] (customer_ID, [date], [time], location, [status], comments)
              OUTPUT INSERTED.booking_ID VALUES (@cid, @date, @time, @location, @status, @comments)`);
    const bookingId = inserted.recordset[0].booking_ID;

    try {
      const jobRes = await pool.request()
        .input('status', sql.VarChar(100), 'Pending')
        .input('serviceId', sql.Int, Number(serviceId))
        .query(`INSERT INTO [new_jobBooking].[job] (job_status, isFollowup, serviceID)
                OUTPUT INSERTED.job_ID VALUES (@status, 0, @serviceId)`);
      await pool.request().input('jobId', sql.Int, jobRes.recordset[0].job_ID).input('bookingId', sql.Int, bookingId)
        .query(`INSERT INTO [new_jobBooking].[work] (job_ID, booking_ID) VALUES (@jobId, @bookingId)`);
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
            .input('serviceID', sql.Int, Number(serviceId))
            .query(`INSERT INTO [payables].[purchases] (customerID, promoID, serviceID) VALUES (@customerID, @promoID, @serviceID)`);
        }
      } catch (promoErr) { console.error('[Cool Fix] promo log skipped:', promoErr.message); }
    }

    return res.status(201).json({ success: true, booking_ID: bookingId,
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

module.exports = { getDashboard, getMyBookings, getMyUnits, registerUnit, getServices, getPromotions, getAddresses, createBooking, cancelBooking };