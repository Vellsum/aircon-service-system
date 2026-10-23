// backend/src/controllers/promotionController.js
// Admin module: discount promotions CRUD on the REAL team table [payables].[promotions]
//
// - status is NOT stored: derived from promo_start / promo_end vs GETDATE()
// - "used" is counted live from [payables].[purchases]
// - discount convention (from db.sql): < 1 = percent fraction (0.15 = 15%), >= 1 = dollars ($10 = 10)

const sql = require('mssql');

// ---------------------------------------------------------------------------
// DB pool — adapts to however src/config/db.js exports the connection
// (handles: poolPromise, pool, connectionPool, db, a factory function, or the
//  pool directly). If this ever throws, copy how customerController.js loads
// the db and mirror it here.
// ---------------------------------------------------------------------------
const dbModule = require('../config/db');

let cachedPool = null;
async function getPool() {
  if (cachedPool) return cachedPool;

  let d = dbModule;
  if (typeof d === 'function') d = await d();            // module.exports = async () => ...

  let p = d;
  if (p && typeof p === 'object') {
    if ('poolPromise' in p) p = p.poolPromise;
    else if ('pool' in p) p = p.pool;
    else if ('connectionPool' in p) p = p.connectionPool;
    else if ('db' in p) p = p.db;
  }
  if (typeof p === 'function') p = await p();
  p = await p;                                           // resolve promise / pool

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
const TABLE = '[payables].[promotions]';

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Turn anything the UI sends into 'YYYY-MM-DD' (or null when unparseable)
const normalizeDate = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);            // 2026-08-01
  if (m) {
    const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);       // 01/08/2026 (DD/MM/YYYY)
  if (m) {
    const d = Number(m[1]); const mo = Number(m[2]); const y = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3,9})[\s-](\d{4})$/); // 01 Aug 2026 / 1-Aug-2026
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    const d = Number(m[1]);
    if (mo && d >= 1 && d <= 31) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return null;
  }

  m = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);   // Aug 1 2026 / August 1, 2026
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    const d = Number(m[2]);
    if (mo && d >= 1 && d <= 31) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
};

// DB date value -> 'YYYY-MM-DD' string (UTC getters = no timezone day-shift)
const toISO = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

// "15%" -> 0.15, "$10" -> 10, "10" -> 10, "0.15" -> 0.15 (DB convention)
const parseDiscount = (value) => {
  if (value == null) return null;
  let s = String(value).trim();
  if (!s) return null;
  const isPercent = s.includes('%');
  s = s.replace(/[$%\s,]/g, '');
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  if (isPercent) {
    if (n <= 0 || n > 100) return null;
    return n / 100;
  }
  return n;
};

// 0.15 -> "15%", 10 -> "$10"
const fmtDiscount = (value) => {
  if (value == null) return '-';
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  if (n > 0 && n < 1) return `${Math.round(n * 100)}%`;
  return `$${n % 1 === 0 ? String(n) : n.toFixed(2)}`;
};

const shapePromo = (row) => ({
  id: row.promo_id,
  promoId: `#PR${String(row.promo_id).padStart(3, '0')}`,
  name: row.promo_name || '',
  code: row.promoCode || '',
  description: row.description || '',
  discount: fmtDiscount(row.discount),
  discountValue: row.discount == null ? null : Number(row.discount),
  validFrom: toISO(row.promo_start),
  validTo: toISO(row.promo_end),
  used: Number(row.timesUsed || 0),
  status: row.status || 'Active',
});

const LIST_SELECT = `
  SELECT p.promo_id, p.promo_name, p.promoCode, p.description, p.discount,
         p.promo_start, p.promo_end,
         CASE
           WHEN p.promo_start IS NOT NULL AND GETDATE() < p.promo_start THEN 'Scheduled'
           WHEN p.promo_end   IS NOT NULL AND GETDATE() > p.promo_end   THEN 'Expired'
           ELSE 'Active'
         END AS status,
         (SELECT COUNT(*) FROM [payables].[purchases] pu WHERE pu.promoID = p.promo_id) AS timesUsed
    FROM [payables].[promotions] p`;

const NOT_DELETED = `ISNULL(p.isdeleted, 'false') <> 'true'`;

// Returns an error message string, or null when everything is fine
const validatePromo = ({ code, discount, from, to, name, description }) => {
  if (!code) return 'Promo code is required';
  if (code.length > 255) return 'Promo code must be 255 characters or fewer';
  if (name && name.length > 255) return 'Promo name must be 255 characters or fewer';
  if (description && description.length > 255) return 'Description must be 255 characters or fewer';
  if (discount == null) return 'Discount is invalid — use "15%" or "$10"';
  if (!from) return 'Valid From is invalid — use YYYY-MM-DD, DD/MM/YYYY or "01 Aug 2026"';
  if (!to) return 'Valid To is invalid — use YYYY-MM-DD, DD/MM/YYYY or "01 Aug 2026"';
  if (from > to) return 'Valid From must be on or before Valid To';
  return null;
};

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

// GET /api/promotions
async function listPromotions(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`${LIST_SELECT} WHERE ${NOT_DELETED} ORDER BY p.promo_id DESC`);
    res.json({ success: true, data: result.recordset.map(shapePromo) });
  } catch (err) {
    console.error('[Cool Fix] GET Promotions Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to load promotions', error: err.message });
  }
}

// POST /api/promotions
async function createPromotion(req, res) {
  try {
    const pool = await getPool();
    const body = req.body || {};

    const name = String(body.name || '').trim() || null;
    const code = String(body.code || '').trim().toUpperCase();
    const description = String(body.description || '').trim() || null;
    const discount = parseDiscount(body.discount);
    const from = normalizeDate(body.validFrom);
    const to = normalizeDate(body.validTo);

    const invalid = validatePromo({ code, discount, from, to, name, description });
    if (invalid) return res.status(400).json({ success: false, message: invalid });

    const dup = await pool.request()
      .input('code', sql.VarChar(255), code)
      .query(`SELECT 1 FROM ${TABLE} WHERE promoCode = @code AND ${NOT_DELETED}`);
    if (dup.recordset.length) {
      return res.status(400).json({ success: false, message: `Promo code "${code}" already exists` });
    }

    const inserted = await pool.request()
      .input('name', sql.VarChar(255), name)
      .input('start', sql.VarChar(10), from)
      .input('end', sql.VarChar(10), to)
      .input('description', sql.VarChar(255), description)
      .input('code', sql.VarChar(255), code)
      .input('discount', sql.Float, discount)
      .query(`
        INSERT INTO [payables].[promotions]
          (promo_name, promo_start, promo_end, description, promoCode, isdeleted, discount, used)
        OUTPUT INSERTED.promo_id
        VALUES (@name, @start, @end, @description, @code, 'false', @discount, '0')`);

    const newId = inserted.recordset[0].promo_id;
    const saved = await pool.request()
      .input('id', sql.Int, newId)
      .query(`${LIST_SELECT} WHERE p.promo_id = @id`);

    res.status(201).json({ success: true, message: 'Promotion created', data: shapePromo(saved.recordset[0]) });
  } catch (err) {
    console.error('[Cool Fix] POST Promotion Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to create promotion', error: err.message });
  }
}

// PUT /api/promotions/:id  (partial updates allowed — "End" sends only { validTo: today })
async function updatePromotion(req, res) {
  try {
    const pool = await getPool();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid promotion id' });
    }

    const current = await pool.request()
      .input('id', sql.Int, id)
      .query(`${LIST_SELECT} WHERE p.promo_id = @id`);
    if (!current.recordset.length) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }
    const row = current.recordset[0];
    const body = req.body || {};

    const name = body.name !== undefined ? (String(body.name).trim() || null) : row.promo_name;
    const code = body.code !== undefined ? String(body.code).trim().toUpperCase() : (row.promoCode || '');
    const description = body.description !== undefined ? (String(body.description).trim() || null) : row.description;
    const discount = body.discount !== undefined
      ? parseDiscount(body.discount)
      : (row.discount == null ? null : Number(row.discount));
    const from = body.validFrom !== undefined ? normalizeDate(body.validFrom) : toISO(row.promo_start);
    const to = body.validTo !== undefined ? normalizeDate(body.validTo) : toISO(row.promo_end);

    const invalid = validatePromo({ code, discount, from, to, name, description });
    if (invalid) return res.status(400).json({ success: false, message: invalid });

    const dup = await pool.request()
      .input('code', sql.VarChar(255), code)
      .input('id', sql.Int, id)
      .query(`SELECT 1 FROM ${TABLE} WHERE promoCode = @code AND promo_id <> @id AND ${NOT_DELETED}`);
    if (dup.recordset.length) {
      return res.status(400).json({ success: false, message: `Promo code "${code}" is already used by another promotion` });
    }

    await pool.request()
      .input('name', sql.VarChar(255), name)
      .input('start', sql.VarChar(10), from)
      .input('end', sql.VarChar(10), to)
      .input('description', sql.VarChar(255), description)
      .input('code', sql.VarChar(255), code)
      .input('discount', sql.Float, discount)
      .input('id', sql.Int, id)
      .query(`
        UPDATE [payables].[promotions]
           SET promo_name = @name, promo_start = @start, promo_end = @end,
               description = @description, promoCode = @code, discount = @discount
         WHERE promo_id = @id`);

    const saved = await pool.request()
      .input('id', sql.Int, id)
      .query(`${LIST_SELECT} WHERE p.promo_id = @id`);

    res.json({ success: true, message: 'Promotion updated', data: shapePromo(saved.recordset[0]) });
  } catch (err) {
    console.error('[Cool Fix] PUT Promotion Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Failed to update promotion', error: err.message });
  }
}

module.exports = { listPromotions, createPromotion, updatePromotion };