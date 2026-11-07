
/**
 * adminDashboardController.js
 * Location: backend/src/controllers/adminDashboardController.js
 *
 * PostgreSQL / Supabase version
 *
 * Tables:
 *   "new_jobBooking"."Booking"
 *   "user3"."technician"
 *
 * DB connection:
 *   ../config/supabaseDb
 *
 * Endpoints:
 *   GET /api/admin/dashboard/summary
 *   GET /api/admin/dashboard/stats
 *   GET /api/admin/dashboard/recent-bookings
 *   GET /api/admin/dashboard/technicians
 */

const pool = require('../config/supabaseDb');

/* ------------------------------------------------------------------ */
/* 1. Constants                                                        */
/* ------------------------------------------------------------------ */

const T_BOOKING = '"new_jobBooking"."Booking"';
const T_TECH = '"user3"."technician"';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const TIMING_RANK = {
  morning: 1,
  afternoon: 2,
  evening: 3
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  completed: 'Completed',
  cancelled: 'Cancelled',
  request_reschedule: 'Request Reschedule',
  rr_pending: 'Reschedule Pending',
  rr_reserved: 'Reschedule Reserved'
};

const TECH_ID_COLS = [
  'technician_ID',
  'technician_id',
  'technicianId',
  'technicianID',
  'tech_id',
  'techID'
];

const BOOKING_ID_COLS = [
  'booking_ID',
  'booking_id',
  'bookingId',
  'bookingID',
  'id'
];

const TECH_NAME_COLS = [
  'technician_name',
  'tech_name',
  'technicianName',
  'name'
];

const CUSTOMER_ID_COLS = [
  'customer_ID',
  'customer_id',
  'customerId',
  'customerID',
  'cust_id',
  'custID'
];

/* ------------------------------------------------------------------ */
/* 2. Helpers                                                          */
/* ------------------------------------------------------------------ */

const pad2 = (n) => String(n).padStart(2, '0');

function dateKey(value) {
  if (!value) return null;

  // PostgreSQL DATE columns commonly return YYYY-MM-DD strings.
  // Keep these as strings to avoid timezone shifting.
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const d = value instanceof Date ? value : new Date(value);

  if (isNaN(d.getTime())) return null;

  return (
    d.getFullYear() +
    '-' +
    pad2(d.getMonth() + 1) +
    '-' +
    pad2(d.getDate())
  );
}

function monthLabel(ym) {
  const parts = String(ym).split('-');
  const m = Number(parts[1]);

  return (MONTHS[m - 1] || '?') + ' ' + parts[0];
}

function statusLabel(key) {
  return (
    STATUS_LABELS[key] ||
    String(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// Return the first matching, non-null value.
function pick(row, names) {
  for (const n of names) {
    if (row && row[n] !== undefined && row[n] !== null) {
      return row[n];
    }
  }

  return null;
}

function hasAnyColumn(rows, names) {
  return rows.some((r) =>
    names.some((n) => Object.prototype.hasOwnProperty.call(r, n))
  );
}

/* ------------------------------------------------------------------ */
/* 3. Technician loader                                                */
/* ------------------------------------------------------------------ */

async function loadTechnicians() {
  const result = await pool.query(
    `SELECT * FROM ${T_TECH}`
  );

  return result.rows
    .map((row) => {
      const id = pick(row, TECH_ID_COLS);

      if (id === null || id === undefined) {
        return null;
      }

      const rating = pick(row, [
        'technician_rating',
        'rating'
      ]);

      return {
        id,
        name: pick(row, TECH_NAME_COLS) || 'Technician #' + id,
        rating: rating === null ? null : Number(rating)
      };
    })
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* 4. Booking mapper                                                   */
/* ------------------------------------------------------------------ */

function makeBookingMapper(techMap) {
  return function mapBooking(row) {
    const techId = pick(row, TECH_ID_COLS);

    const tech =
      techId !== null && techId !== undefined
        ? techMap.get(String(techId))
        : null;

    const cost = row.estimateTotalCost;
    const units = row.numberOfUnits;

    return {
      id: pick(row, BOOKING_ID_COLS),

      date: dateKey(row.date),

      timing: row.timing || null,

      status: row.status || null,

      statusKey: String(row.status || '').toLowerCase(),

      units:
        units === undefined || units === null
          ? null
          : Number(units),

      cost:
        cost === undefined || cost === null
          ? null
          : Number(cost),

      techId,

      technician: tech ? tech.name : null,

      customerId: pick(row, CUSTOMER_ID_COLS)
    };
  };
}

/* ------------------------------------------------------------------ */
/* 5. Main dashboard summary                                           */
/* ------------------------------------------------------------------ */

async function buildSummary() {
  const t0 = Date.now();
  const warnings = [];

  /* -------------------------------------------------------------- */
  /* Q1: Booking counts grouped by status                            */
  /* -------------------------------------------------------------- */

  const q1 = await pool.query(`
    SELECT
      LOWER("status") AS status_key,
      COUNT(*) AS cnt,
      SUM("estimateTotalCost") AS revenue,
      SUM(
        CASE
          WHEN "estimateTotalCost" IS NULL THEN 1
          ELSE 0
        END
      ) AS unpriced
    FROM ${T_BOOKING}
    GROUP BY LOWER("status")
  `);

  const byStatus = {};

  let totalBookings = 0;
  let totalRevenue = 0;

  for (const r of q1.rows) {
    byStatus[r.status_key] = {
      count: Number(r.cnt) || 0,
      revenue: Number(r.revenue) || 0,
      unpriced: Number(r.unpriced) || 0
    };

    totalBookings += Number(r.cnt) || 0;
    totalRevenue += Number(r.revenue) || 0;
  }

  const completed = byStatus.completed || {
    count: 0,
    revenue: 0,
    unpriced: 0
  };

  const stats = {
    totalBookings,

    completed: completed.count,

    pending: (byStatus.pending || {}).count || 0,

    confirmed: (byStatus.confirmed || {}).count || 0,

    assigned: (byStatus.assigned || {}).count || 0,

    cancelled: (byStatus.cancelled || {}).count || 0,

    completedRate: totalBookings
      ? Math.round((completed.count / totalBookings) * 100)
      : 0,

    totalRevenue
  };

  /* -------------------------------------------------------------- */
  /* Booking pipeline                                                */
  /* -------------------------------------------------------------- */

  const STATUS_ORDER = [
    'pending',
    'confirmed',
    'assigned',
    'request_reschedule',
    'rr_pending',
    'rr_reserved',
    'completed',
    'cancelled'
  ];

  const pipeline = [];

  for (const key of STATUS_ORDER) {
    if (byStatus[key]) {
      pipeline.push({
        key,
        label: statusLabel(key),
        count: byStatus[key].count
      });
    }
  }

  for (const key of Object.keys(byStatus)) {
    if (!STATUS_ORDER.includes(key)) {
      pipeline.push({
        key,
        label: statusLabel(key),
        count: byStatus[key].count
      });
    }
  }

  /* -------------------------------------------------------------- */
  /* Q2: Monthly completed revenue - last 12 months                  */
  /* -------------------------------------------------------------- */

  const q2 = await pool.query(`
    SELECT
      TO_CHAR("date", 'YYYY-MM') AS ym,
      COUNT(*) AS cnt,
      SUM("estimateTotalCost") AS revenue
    FROM ${T_BOOKING}
    WHERE LOWER("status") = 'completed'
      AND "date" >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY TO_CHAR("date", 'YYYY-MM')
    ORDER BY ym
  `);

  const dbMonths = {};

  for (const r of q2.rows) {
    dbMonths[r.ym] = {
      count: Number(r.cnt) || 0,
      value: Number(r.revenue) || 0
    };
  }

  const monthly = [];

  const today = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth() - i,
      1
    );

    const key =
      d.getFullYear() +
      '-' +
      pad2(d.getMonth() + 1);

    const hit = dbMonths[key] || {
      count: 0,
      value: 0
    };

    monthly.push({
      key,
      label: monthLabel(key),
      value: hit.value,
      count: hit.count
    });
  }

  /* -------------------------------------------------------------- */
  /* Quarterly revenue                                               */
  /* -------------------------------------------------------------- */

  const qMap = {};

  for (const m of monthly) {
    const parts = m.key.split('-');

    const quarter =
      Math.floor((Number(parts[1]) - 1) / 3) + 1;

    const qKey = parts[0] + '-Q' + quarter;

    if (!qMap[qKey]) {
      qMap[qKey] = {
        key: qKey,
        label: 'Q' + quarter + ' ' + parts[0],
        value: 0,
        count: 0
      };
    }

    qMap[qKey].value += m.value;
    qMap[qKey].count += m.count;
  }

  const quarterly = Object.values(qMap);

  /* -------------------------------------------------------------- */
  /* Load technicians                                                */
  /* -------------------------------------------------------------- */

  let techRows = [];

  try {
    techRows = await loadTechnicians();
  } catch (e) {
    warnings.push('technician list failed: ' + e.message);
  }

  const techMap = new Map(
    techRows.map((t) => [String(t.id), t])
  );

  const mapBooking = makeBookingMapper(techMap);

  /* -------------------------------------------------------------- */
  /* Q3: Upcoming bookings - next 14 days                            */
  /* -------------------------------------------------------------- */

  let upcoming = [];

  try {
    const q3 = await pool.query(`
      SELECT *
      FROM ${T_BOOKING}
      WHERE "date" >= CURRENT_DATE
        AND "date" < CURRENT_DATE + INTERVAL '15 days'
      ORDER BY "date" ASC
    `);

    upcoming = q3.rows
      .map(mapBooking)
      .filter(
        (b) =>
          b.statusKey !== 'completed' &&
          b.statusKey !== 'cancelled'
      )
      .sort((a, b) => {
        if (a.date !== b.date) {
          return a.date < b.date ? -1 : 1;
        }

        const ra =
          TIMING_RANK[String(a.timing || '').toLowerCase()] || 9;

        const rb =
          TIMING_RANK[String(b.timing || '').toLowerCase()] || 9;

        return ra - rb;
      });

  } catch (e) {
    warnings.push('upcoming bookings failed: ' + e.message);
  }

  /* -------------------------------------------------------------- */
  /* Q4: Unassigned bookings                                         */
  /* -------------------------------------------------------------- */

  let unassigned = [];

  try {
    const q4 = await pool.query(`
      SELECT *
      FROM ${T_BOOKING}
      WHERE LOWER("status") NOT IN ('completed', 'cancelled')
    `);

    if (hasAnyColumn(q4.rows, TECH_ID_COLS)) {
      unassigned = q4.rows
        .map(mapBooking)
        .filter(
          (b) =>
            b.techId === null ||
            Number(b.techId) === 0
        );
    } else {
      warnings.push(
        'Booking table has no recognised technician column - unassigned list disabled.'
      );
    }

  } catch (e) {
    warnings.push('unassigned check failed: ' + e.message);
  }

  /* -------------------------------------------------------------- */
  /* Q5: Completed jobs per technician                               */
  /* -------------------------------------------------------------- */

  const jobsByTech = {};

  try {
    const q5 = await pool.query(`
      SELECT *
      FROM ${T_BOOKING}
      WHERE LOWER("status") = 'completed'
    `);

    if (hasAnyColumn(q5.rows, TECH_ID_COLS)) {
      for (const row of q5.rows) {
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

  /* -------------------------------------------------------------- */
  /* Technician ratings and completed jobs                           */
  /* -------------------------------------------------------------- */

  const techRatings = techRows
    .map((t) => ({
      ...t,
      completedJobs: jobsByTech[String(t.id)] || 0
    }))
    .sort(
      (a, b) => (b.rating || 0) - (a.rating || 0)
    );

  /* -------------------------------------------------------------- */
  /* Final response                                                  */
  /* -------------------------------------------------------------- */

  const result = {
    ok: true,

    generatedAt: new Date().toISOString(),

    timingMs: Date.now() - t0,

    stats,

    pipeline,

    revenue: {
      monthly,
      quarterly,
      unpricedCompleted: completed.unpriced
    },

    upcoming,

    unassigned,

    techRatings
  };

  if (warnings.length) {
    result.warnings = warnings;
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* 6. Route handlers                                                   */
/* ------------------------------------------------------------------ */

// GET /api/admin/dashboard/summary

async function getDashboardSummary(req, res) {
  try {
    res.json(await buildSummary());

  } catch (err) {
    console.error(
      '[adminDashboardController] summary failed:',
      err.message
    );

    res.status(500).json({
      ok: false,
      error: 'Dashboard summary failed',
      detail: err.message
    });
  }
}

// GET /api/admin/dashboard/stats

async function getDashboardStats(req, res) {
  try {
    const s = await buildSummary();

    res.json({
      ok: true,
      stats: s.stats,
      pipeline: s.pipeline,
      revenue: s.revenue,
      timingMs: s.timingMs
    });

  } catch (err) {
    console.error(
      '[adminDashboardController] stats failed:',
      err.message
    );

    res.status(500).json({
      ok: false,
      error: 'Dashboard stats failed',
      detail: err.message
    });
  }
}

// GET /api/admin/dashboard/recent-bookings

async function getRecentBookings(req, res) {
  try {
    const q = await pool.query(`
      SELECT *
      FROM ${T_BOOKING}
      ORDER BY "date" DESC
      LIMIT 10
    `);

    const techRows = await loadTechnicians();

    const mapBooking = makeBookingMapper(
      new Map(techRows.map((t) => [String(t.id), t]))
    );

    res.json({
      ok: true,
      bookings: q.rows.map(mapBooking)
    });

  } catch (err) {
    console.error(
      '[adminDashboardController] recent-bookings failed:',
      err.message
    );

    res.status(500).json({
      ok: false,
      error: 'Recent bookings failed',
      detail: err.message
    });
  }
}

// GET /api/admin/dashboard/technicians

async function getTechnicians(req, res) {
  try {
    const techRows = await loadTechnicians();

    res.json({
      ok: true,
      technicians: techRows
    });

  } catch (err) {
    console.error(
      '[adminDashboardController] technicians failed:',
      err.message
    );

    res.status(500).json({
      ok: false,
      error: 'Technician list failed',
      detail: err.message
    });
  }
}

/* ------------------------------------------------------------------ */
/* 7. Exports                                                          */
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
  technicians: getTechnicians
};

console.log(
  '[adminDashboardController] PostgreSQL controller loaded.'
);
