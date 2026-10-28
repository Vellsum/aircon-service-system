/**
 * adminDashboardController.js
 * Location: backend/src/controllers/adminDashboardController.js
 *
 * Powers the admin dashboard endpoints:
 *   GET /api/admin/dashboard/summary            (main)
 *   GET /api/admin/dashboard/stats              (legacy)
 *   GET /api/admin/dashboard/recent-bookings    (legacy)
 *   GET /api/admin/dashboard/technicians        (legacy)
 *
 * Safe by design:
 *  - SQL only uses confirmed column names from db.sql:
 *      new_jobBooking.Booking -> status, booking_date, timing,
 *                                numberOfUnits, estimateTotalCost
 *      user3.technician       -> full table via SELECT *
 *  - Everything else (technician/customer ids, names) is resolved in
 *    JavaScript from SELECT * rows, so a renamed column can never
 *    crash the endpoint - it only degrades gracefully (see "warnings").
 */

/* ------------------------------------------------------------------ */
/* 1. DB module resolution - adapts to whatever your db file exports   */
/*    Tries the most common locations in your project automatically.   */
/* ------------------------------------------------------------------ */
const DB_CANDIDATES = [
  '../db',
  '../config/db',
  '../config/database',
  '../database/db',
  '../data/db',
  '../data/database',
];

let dbModule = null;
let dbModulePath = null;
for (const p of DB_CANDIDATES) {
  try {
    dbModule = require(p);
    dbModulePath = p;
    break;
  } catch (e) {
    /* try the next candidate */
  }
}

async function getPool() {
  if (!dbModule) {
    throw new Error(
      'adminDashboardController could not find your DB module (tried: ' +
        DB_CANDIDATES.join(', ') +
        '). Edit DB_CANDIDATES at the top of adminDashboardController.js to match the require path your other controllers use.'
    );
  }
  const d = dbModule;
  let candidate;
  if (typeof d.request === 'function') {
    candidate = d; // the module IS a connected mssql pool
  } else if (typeof d.getPool === 'function') {
    candidate = d.getPool();
  } else if (typeof d.getConnection === 'function') {
    candidate = d.getConnection();
  } else if (d.poolPromise) {
    candidate = d.poolPromise;
  } else if (d.pool) {
    candidate = d.pool;
  } else if (typeof d.promise === 'function') {
    candidate = d.promise();
  } else if (typeof d.then === 'function') {
    candidate = d; // the module IS a promise of a pool
  } else if (typeof d.connect === 'function') {
    candidate = d.connect(); // unconnected pool
  } else {
    throw new Error(
      'adminDashboardController could not resolve a mssql pool from "' + dbModulePath +
        '". Tell me what your db file exports and I will adapt this file.'
    );
  }
  const pool = await candidate;
  if (pool && pool.connected === false && typeof pool.connect === 'function') {
    await pool.connect();
  }
  return pool;
}

/* ------------------------------------------------------------------ */
/* 2. Small helpers                                                    */
/* ------------------------------------------------------------------ */
const T_BOOKING = 'new_jobBooking.Booking';
const T_TECH = 'user3.technician';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TIMING_RANK = { morning: 1, afternoon: 2, evening: 3 };

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  completed: 'Completed',
  cancelled: 'Cancelled',
  request_reschedule: 'Request Reschedule',
  rr_pending: 'Reschedule Pending',
  rr_reserved: 'Reschedule Reserved',
};

const TECH_ID_COLS = ['technician_id', 'technicianId', 'technicianID', 'tech_id', 'techID'];
const BOOKING_ID_COLS = ['booking_id', 'bookingId', 'bookingID', 'Booking_id', 'id'];
const TECH_NAME_COLS = ['technician_name', 'tech_name', 'technicianName', 'name'];
const CUSTOMER_ID_COLS = ['customer_id', 'customerId', 'customerID', 'cust_id', 'custID'];

const pad2 = (n) => String(n).padStart(2, '0');

function dateKey(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function monthLabel(ym) {
  const parts = String(ym).split('-');
  const m = Number(parts[1]);
  return (MONTHS[m - 1] || '?') + ' ' + parts[0];
}

function statusLabel(key) {
  return STATUS_LABELS[key] || String(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// first matching, non-null value among candidate column names
function pick(row, names) {
  for (const n of names) {
    if (row && row[n] !== undefined && row[n] !== null) return row[n];
  }
  return null;
}

// does ANY row actually contain one of these columns?
function hasAnyColumn(rows, names) {
  return rows.some((r) => names.some((n) => Object.prototype.hasOwnProperty.call(r, n)));
}

/* ------------------------------------------------------------------ */
/* 3. Shared builders                                                  */
/* ------------------------------------------------------------------ */
async function loadTechnicians(pool) {
  const q = await pool.request().query('SELECT * FROM ' + T_TECH);
  return q.recordset
    .map((row) => {
      const id = pick(row, TECH_ID_COLS) ?? pick(row, ['id']);
      if (id === null || id === undefined) return null;
      const rating = pick(row, ['technician_rating', 'rating']);
      return {
        id,
        name: pick(row, TECH_NAME_COLS) || 'Technician #' + id,
        rating: rating === null ? null : Number(rating),
      };
    })
    .filter(Boolean);
}

function makeBookingMapper(techMap) {
  return function mapBooking(row) {
    const techId = pick(row, TECH_ID_COLS);
    const tech = techId !== null && techId !== undefined ? techMap.get(String(techId)) : null;
    const cost = row.estimateTotalCost;
    const units = row.numberOfUnits;
    return {
      id: pick(row, BOOKING_ID_COLS),
      date: dateKey(row.booking_date),
      timing: row.timing || null,
      status: row.status || null,
      statusKey: String(row.status || '').toLowerCase(),
      units: units === undefined || units === null ? null : Number(units),
      cost: cost === undefined || cost === null ? null : Number(cost),
      techId: techId === undefined ? null : techId,
      technician: tech ? tech.name : null,
      customerId: pick(row, CUSTOMER_ID_COLS),
    };
  };
}

async function buildSummary() {
  const t0 = Date.now();
  const pool = await getPool();
  const warnings = [];

  /* -- Q1: per-status counts (confirmed columns only) --------------- */
  const q1 = await pool.request().query(`
    SELECT
      LOWER(status) AS status_key,
      COUNT(*)      AS cnt,
      SUM(CAST(estimateTotalCost AS FLOAT))                      AS revenue,
      SUM(CASE WHEN estimateTotalCost IS NULL THEN 1 ELSE 0 END) AS unpriced
    FROM ${T_BOOKING}
    GROUP BY LOWER(status)
  `);

  const byStatus = {};
  let totalBookings = 0;
  let totalRevenue = 0;
  for (const r of q1.recordset) {
    byStatus[r.status_key] = {
      count: Number(r.cnt) || 0,
      revenue: Number(r.revenue) || 0,
      unpriced: Number(r.unpriced) || 0,
    };
    totalBookings += Number(r.cnt) || 0;
    totalRevenue += Number(r.revenue) || 0;
  }

  const completed = byStatus.completed || { count: 0, revenue: 0, unpriced: 0 };
  const stats = {
    totalBookings,
    completed: completed.count,
    pending: (byStatus.pending || {}).count || 0,
    confirmed: (byStatus.confirmed || {}).count || 0,
    assigned: (byStatus.assigned || {}).count || 0,
    cancelled: (byStatus.cancelled || {}).count || 0,
    completedRate: totalBookings ? Math.round((completed.count / totalBookings) * 100) : 0,
    totalRevenue,
  };

  /* -- pipeline (known order first, unknown statuses appended) ------ */
  const STATUS_ORDER = [
    'pending', 'confirmed', 'assigned',
    'request_reschedule', 'rr_pending', 'rr_reserved',
    'completed', 'cancelled',
  ];
  const pipeline = [];
  for (const key of STATUS_ORDER) {
    if (byStatus[key]) pipeline.push({ key, label: statusLabel(key), count: byStatus[key].count });
  }
  for (const key of Object.keys(byStatus)) {
    if (!STATUS_ORDER.includes(key)) {
      pipeline.push({ key, label: statusLabel(key), count: byStatus[key].count });
    }
  }

  /* -- Q2: monthly completed revenue, last 12 months ---------------- */
  const q2 = await pool.request().query(`
    SELECT
      CONVERT(varchar(7), booking_date, 23) AS ym,
      COUNT(*)                              AS cnt,
      SUM(CAST(estimateTotalCost AS FLOAT)) AS revenue
    FROM ${T_BOOKING}
    WHERE LOWER(status) = 'completed'
      AND booking_date >= DATEADD(MONTH, -12, GETDATE())
    GROUP BY CONVERT(varchar(7), booking_date, 23)
    ORDER BY ym
  `);
  const dbMonths = {};
  for (const r of q2.recordset) {
    dbMonths[r.ym] = { count: Number(r.cnt) || 0, value: Number(r.revenue) || 0 };
  }

  const monthly = [];
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + pad2(d.getMonth() + 1);
    const hit = dbMonths[key] || { count: 0, value: 0 };
    monthly.push({ key, label: monthLabel(key), value: hit.value, count: hit.count });
  }

  const qMap = {};
  for (const m of monthly) {
    const parts = m.key.split('-');
    const quarter = Math.floor((Number(parts[1]) - 1) / 3) + 1;
    const qKey = parts[0] + '-Q' + quarter;
    if (!qMap[qKey]) qMap[qKey] = { key: qKey, label: 'Q' + quarter + ' ' + parts[0], value: 0, count: 0 };
    qMap[qKey].value += m.value;
    qMap[qKey].count += m.count;
  }
  const quarterly = Object.values(qMap);

  /* -- technicians (SELECT * -> tolerant picks) --------------------- */
  let techRows = [];
  try {
    techRows = await loadTechnicians(pool);
  } catch (e) {
    warnings.push('technician list failed: ' + e.message);
  }
  const techMap = new Map(techRows.map((t) => [String(t.id), t]));
  const mapBooking = makeBookingMapper(techMap);

  /* -- Q3: upcoming bookings, next 14 days -------------------------- */
  let upcoming = [];
  try {
    const q3 = await pool.request().query(`
      SELECT * FROM ${T_BOOKING}
      WHERE booking_date >= CAST(GETDATE() AS DATE)
        AND booking_date <  DATEADD(DAY, 15, CAST(GETDATE() AS DATE))
      ORDER BY booking_date
    `);
    upcoming = q3.recordset
      .map(mapBooking)
      .filter((b) => b.statusKey !== 'completed' && b.statusKey !== 'cancelled')
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        const ra = TIMING_RANK[String(a.timing || '').toLowerCase()] || 9;
        const rb = TIMING_RANK[String(b.timing || '').toLowerCase()] || 9;
        return ra - rb;
      });
  } catch (e) {
    warnings.push('upcoming bookings failed: ' + e.message);
  }

  /* -- Q4: open bookings -> unassigned detection -------------------- */
  let unassigned = [];
  try {
    const q4 = await pool.request().query(`
      SELECT * FROM ${T_BOOKING}
      WHERE LOWER(status) NOT IN ('completed', 'cancelled')
    `);
    if (hasAnyColumn(q4.recordset, TECH_ID_COLS)) {
      unassigned = q4.recordset.map(mapBooking).filter((b) => b.techId === null || b.techId === 0);
    } else {
      warnings.push(
        'Booking table has no technician column I recognise (tried: ' +
          TECH_ID_COLS.join(', ') + ') - unassigned list disabled.'
      );
    }
  } catch (e) {
    warnings.push('unassigned check failed: ' + e.message);
  }

  /* -- Q5: completed jobs per technician ---------------------------- */
  const jobsByTech = {};
  try {
    const q5 = await pool.request().query(`
      SELECT * FROM ${T_BOOKING} WHERE LOWER(status) = 'completed'
    `);
    if (hasAnyColumn(q5.recordset, TECH_ID_COLS)) {
      for (const row of q5.recordset) {
        const id = pick(row, TECH_ID_COLS);
        if (id !== null && id !== undefined) {
          const k = String(id);
          jobsByTech[k] = (jobsByTech[k] || 0) + 1;
        }
      }
    }
  } catch (e) {
    warnings.push('per-technician job counts failed: ' + e.message);
  }

  const techRatings = techRows
    .map((t) => ({ ...t, completedJobs: jobsByTech[String(t.id)] || 0 }))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const result = {
    ok: true,
    generatedAt: new Date().toISOString(),
    timingMs: Date.now() - t0,
    stats,
    pipeline,
    revenue: { monthly, quarterly, unpricedCompleted: completed.unpriced },
    upcoming,
    unassigned,
    techRatings,
  };
  if (warnings.length) result.warnings = warnings;
  return result;
}

/* ------------------------------------------------------------------ */
/* 4. Route handlers                                                   */
/* ------------------------------------------------------------------ */

// GET /api/admin/dashboard/summary
async function getDashboardSummary(req, res) {
  try {
    res.json(await buildSummary());
  } catch (err) {
    console.error('[adminDashboardController] summary failed:', err.message);
    res.status(500).json({ ok: false, error: 'Dashboard summary failed', detail: err.message });
  }
}

// GET /api/admin/dashboard/stats  (legacy)
async function getDashboardStats(req, res) {
  try {
    const s = await buildSummary();
    res.json({ ok: true, stats: s.stats, pipeline: s.pipeline, revenue: s.revenue, timingMs: s.timingMs });
  } catch (err) {
    console.error('[adminDashboardController] stats failed:', err.message);
    res.status(500).json({ ok: false, error: 'Dashboard stats failed', detail: err.message });
  }
}

// GET /api/admin/dashboard/recent-bookings  (legacy)
async function getRecentBookings(req, res) {
  try {
    const pool = await getPool();
    const q = await pool.request().query(`
      SELECT TOP 10 * FROM ${T_BOOKING}
      ORDER BY booking_date DESC
    `);
    const techRows = await loadTechnicians(pool);
    const mapBooking = makeBookingMapper(new Map(techRows.map((t) => [String(t.id), t])));
    res.json({ ok: true, bookings: q.recordset.map(mapBooking) });
  } catch (err) {
    console.error('[adminDashboardController] recent-bookings failed:', err.message);
    res.status(500).json({ ok: false, error: 'Recent bookings failed', detail: err.message });
  }
}

// GET /api/admin/dashboard/technicians  (legacy)
async function getTechnicians(req, res) {
  try {
    const pool = await getPool();
    const techRows = await loadTechnicians(pool);
    res.json({ ok: true, technicians: techRows });
  } catch (err) {
    console.error('[adminDashboardController] technicians failed:', err.message);
    res.status(500).json({ ok: false, error: 'Technician list failed', detail: err.message });
  }
}

/* ------------------------------------------------------------------ */
/* 5. Exports - every plausible handler name is included, so whichever */
/*    name your adminDashboardRoutes.js references, it resolves.       */
/* ------------------------------------------------------------------ */
module.exports = {
  getDashboardSummary,
  getSummary: getDashboardSummary,
  summary: getDashboardSummary,
  dashboardSummary: getDashboardSummary,
  getDashboardStats,
  getStats: getDashboardStats,
  stats: getDashboardStats,
  getRecentBookings,
  recentBookings: getRecentBookings,
  getTechnicians,
  getDashboardTechnicians: getTechnicians,
  technicians: getTechnicians,
};

console.log('[adminDashboardController] loaded. DB module: ' + (dbModulePath || 'NOT FOUND - edit DB_CANDIDATES at the top of this file'));