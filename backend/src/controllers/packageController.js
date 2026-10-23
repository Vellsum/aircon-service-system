// backend/src/controllers/packageController.js
// Admin module: service packages = subscription plans on [payables].[subscription]
//
// - price is DERIVED: service.price * numberOfBookings (no price column in the table)
// - validity is DERIVED: timeTillNextService * numberOfBookings days
// - status: isDeleted BIT (0 = Active, 1 = Inactive) — same convention as payables.service
// - Top Seller / Subscribers = live COUNT from [payables].[currentSubscribers]

const sql = require('mssql');

// ---------------------------------------------------------------------------
// DB pool — adapts to however src/config/db.js exports the connection
// ---------------------------------------------------------------------------
const dbModule = require('../config/db');

let cachedPool = null;
async function getPool() {
  if (cachedPool) return cachedPool;

  let d = dbModule;
  if (typeof d === 'function') d = await d();

  let p = d;
  if (p && typeof p === 'object') {
    if ('poolPromise' in p) p = p.poolPromise;
    else if ('pool' in p) p = p.pool;
    else if ('connectionPool' in p) p = p.connectionPool;
    else if ('db' in p) p = p.db;
  }
  if (typeof p === 'function') p = await p();
  p = await p;

  if (p && typeof p === 'object' && typeof p.request !== 'function') {
    if (p.pool) p = await p.pool;
    else if (p.poolPromise) p = await p.poolPromise;
  }

  if (!p || typeof p.request !== 'function') {
    throw new Error(
      'Could not get a valid mssql pool from ../config/db. ' +
      'Open src/controllers/customerController.js, see how IT loads the db, and mirror it here.'
    );
  }
  cachedPool = p;
  return p;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const toInt = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
};

const fmtMoney = (n) => (n == null ? '-' : `$${Number(n) % 1 === 0 ? String(Number(n)) : Number(n).toFixed(2)}`);

const shapePackage = (row) => {
  const bookings = row.numberOfBookings == null ? 0 : Number(row.numberOfBookings);
  const perDays = row.timeTillNextService == null ? 0 : Number(row.timeTillNextService);
  const servicePrice = row.service_price == null ? null : Number(row.service_price);
  const totalDays = perDays * bookings;
  return {
    id: row.subscriptionID,
    packageId: `#PK${String(row.subscriptionID).padStart(3, '0')}`,
    name: row.name || '',
    description: row.description || '',
    recurringServiceID: row.recurringServiceID == null ? null : Number(row.recurringServiceID),
    serviceName: row.service_name || '',
    servicePrice,
    numberOfBookings: bookings,
    timeTillNextService: perDays,
    price: servicePrice == null ? '-' : fmtMoney(servicePrice * bookings),
    validity: totalDays > 0 ? `${perDays} days × ${bookings} (~${Math.round(totalDays / 30)} months)` : '—',
    subscribers: Number(row.subscribers || 0),
    status: Number(row.isDeleted) === 1 ? 'Inactive' : 'Active',
  };
};

const LIST_SELECT = `
  SELECT s.subscriptionID, s.name, s.description, s.recurringServiceID,
         s.timeTillNextService, s.numberOfBookings, s.isDeleted,
         sv.service_name, sv.price AS service_price,
         (SELECT COUNT(*) FROM [payables].[currentSubscribers] cs
           WHERE cs.subscriptionid = s.subscriptionID) AS subscribers
    FROM [payables].[subscription] s
    LEFT JOIN [payables].[service] sv ON sv.service_id = s.recurringServiceID`;

// Returns an error message string, or null when everything is fine
const validatePackage = ({ name, serviceId, days, bookings }) => {
  if (!name) return 'Package name is required';
  if (name.length > 255) return 'Package name must be 255 characters or fewer';
  if (serviceId == null) return 'Please choose a recurring service';
  if (days == null || days < 1) return 'Days between services must be a whole number of at least 1';
  if (bookings == null || bookings < 1) return 'Number of bookings must be a whole number of at least 1';
  return null;
};

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

// GET /api/packages
async function listPackages(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`${LIST_SELECT} ORDER BY s.subscriptionID ASC`);
    res.json({ success: true, data: result.recordset.map(shapePackage) });
  } catch (err) {
    console.error('[Cool Fix] GET Packages Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to load packages', error: err.message });
  }
}

// GET /api/packages/services  (options for the "Recurring Service" dropdown)
async function listServices(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT service_id, service_name, price
        FROM [payables].[service]
       WHERE ISNULL(isdeleted, 0) = 0
       ORDER BY service_id ASC`);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('[Cool Fix] GET Package Services Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to load services', error: err.message });
  }
}

// POST /api/packages
async function createPackage(req, res) {
  try {
    const pool = await getPool();
    const body = req.body || {};

    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim() || null;
    const serviceId = toInt(body.recurringServiceID);
    const days = toInt(body.timeTillNextService);
    const bookings = toInt(body.numberOfBookings);
    const isDeleted = String(body.status || 'Active').trim() === 'Inactive' ? 1 : 0;

    const invalid = validatePackage({ name, serviceId, days, bookings });
    if (invalid) return res.status(400).json({ success: false, message: invalid });

    const svc = await pool.request()
      .input('sid', sql.Int, serviceId)
      .query(`SELECT 1 FROM [payables].[service] WHERE service_id = @sid AND ISNULL(isdeleted, 0) = 0`);
    if (!svc.recordset.length) {
      return res.status(400).json({ success: false, message: 'Selected service does not exist or is deleted' });
    }

    const inserted = await pool.request()
      .input('name', sql.VarChar(255), name)
      .input('description', sql.VarChar(sql.MAX), description)
      .input('sid', sql.Int, serviceId)
      .input('days', sql.Int, days)
      .input('bookings', sql.Int, bookings)
      .input('del', sql.Bit, isDeleted)
      .query(`
        INSERT INTO [payables].[subscription]
          (name, description, recurringServiceID, timeTillNextService, numberOfBookings, isDeleted)
        OUTPUT INSERTED.subscriptionID
        VALUES (@name, @description, @sid, @days, @bookings, @del)`);

    const newId = inserted.recordset[0].subscriptionID;
    const saved = await pool.request()
      .input('id', sql.Int, newId)
      .query(`${LIST_SELECT} WHERE s.subscriptionID = @id`);

    res.status(201).json({ success: true, message: 'Package created', data: shapePackage(saved.recordset[0]) });
  } catch (err) {
    console.error('[Cool Fix] POST Package Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to create package', error: err.message });
  }
}

// PUT /api/packages/:id  (partial updates allowed — Deactivate sends only { status: "Inactive" })
async function updatePackage(req, res) {
  try {
    const pool = await getPool();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid package id' });
    }

    const current = await pool.request()
      .input('id', sql.Int, id)
      .query(`${LIST_SELECT} WHERE s.subscriptionID = @id`);
    if (!current.recordset.length) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    const row = current.recordset[0];
    const body = req.body || {};

    const name = body.name !== undefined ? String(body.name).trim() : (row.name || '');
    const description = body.description !== undefined ? (String(body.description).trim() || null) : row.description;
    const serviceId = body.recurringServiceID !== undefined
      ? toInt(body.recurringServiceID)
      : (row.recurringServiceID == null ? null : Number(row.recurringServiceID));
    const days = body.timeTillNextService !== undefined
      ? toInt(body.timeTillNextService)
      : (row.timeTillNextService == null ? null : Number(row.timeTillNextService));
    const bookings = body.numberOfBookings !== undefined
      ? toInt(body.numberOfBookings)
      : (row.numberOfBookings == null ? null : Number(row.numberOfBookings));
    const isDeleted = body.status !== undefined
      ? (String(body.status).trim() === 'Inactive' ? 1 : 0)
      : (Number(row.isDeleted) === 1 ? 1 : 0);

    const invalid = validatePackage({ name, serviceId, days, bookings });
    if (invalid) return res.status(400).json({ success: false, message: invalid });

    const svc = await pool.request()
      .input('sid', sql.Int, serviceId)
      .query(`SELECT 1 FROM [payables].[service] WHERE service_id = @sid AND ISNULL(isdeleted, 0) = 0`);
    if (!svc.recordset.length) {
      return res.status(400).json({ success: false, message: 'Selected service does not exist or is deleted' });
    }

    await pool.request()
      .input('name', sql.VarChar(255), name)
      .input('description', sql.VarChar(sql.MAX), description)
      .input('sid', sql.Int, serviceId)
      .input('days', sql.Int, days)
      .input('bookings', sql.Int, bookings)
      .input('del', sql.Bit, isDeleted)
      .input('id', sql.Int, id)
      .query(`
        UPDATE [payables].[subscription]
           SET name = @name, description = @description, recurringServiceID = @sid,
               timeTillNextService = @days, numberOfBookings = @bookings, isDeleted = @del
         WHERE subscriptionID = @id`);

    const saved = await pool.request()
      .input('id', sql.Int, id)
      .query(`${LIST_SELECT} WHERE s.subscriptionID = @id`);

    res.json({ success: true, message: 'Package updated', data: shapePackage(saved.recordset[0]) });
  } catch (err) {
    console.error('[Cool Fix] PUT Package Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to update package', error: err.message });
  }
}

module.exports = { listPackages, listServices, createPackage, updatePackage };