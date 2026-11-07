/**
 * Cool Fix - Admin Booking Controller
 * Supabase / PostgreSQL version
 *
 * Tables:
 *   "new_jobBooking"."Booking"
 *   "new_jobBooking"."job"
 *   "new_jobBooking"."work"
 *   "payables"."service"
 *   "payables"."subscription"
 *   "payables"."promotions"
 *   "user3"."newCustomer"
 *   "user3"."technician"
 */

const pool = require('../config/supabaseDb');

/* --------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */

// Normalize incoming time to HH:MM:SS.
function normalizeTimeToSql(t) {
  if (t === null || t === undefined) return null;

  const s = String(t).trim();

  if (!s || ['undefined', 'null'].includes(s.toLowerCase())) {
    return null;
  }

  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (m12) {
    let hour = Number(m12[1]) % 12;

    if (/pm/i.test(m12[3])) hour += 12;

    return `${String(hour).padStart(2, '0')}:${m12[2]}:00`;
  }

  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (m24) {
    return `${String(Number(m24[1])).padStart(2, '0')}:${m24[2]}:${m24[3] || '00'}`;
  }

  return null;
}

// Accept only YYYY-MM-DD.
function normalizeDateToSql(d) {
  if (!d) return null;

  const s = String(d).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  return s;
}

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Every normal booking should have a job + work link.
 *
 * "new_jobBooking"."job":
 *   "job_ID", job_status, "isFollowup", "serviceID"
 *
 * "new_jobBooking"."work":
 *   "job_ID", "booking_ID"
 */
async function ensureJobLink(bookingId, serviceId = null) {
  const bid = normalizeId(bookingId);

  if (!bid) {
    throw new Error('Invalid booking ID supplied to ensureJobLink.');
  }

  const existing = await pool.query(
    `
      SELECT 1
      FROM "new_jobBooking"."work"
      WHERE "booking_ID" = $1
      LIMIT 1
    `,
    [bid]
  );

  if (existing.rowCount > 0) return;

  let svcId = normalizeId(serviceId);

  if (!svcId) {
    const serviceResult = await pool.query(
      `
        SELECT service_id
        FROM "payables"."service"
        ORDER BY service_id
        LIMIT 1
      `
    );

    svcId = normalizeId(serviceResult.rows[0]?.service_id);
  }

  if (!svcId) {
    console.warn(`[Cool Fix] No service found. Job link skipped for booking #${bid}.`);
    return;
  }

  const jobResult = await pool.query(
    `
      INSERT INTO "new_jobBooking"."job"
        (job_status, "isFollowup", "serviceID")
      VALUES ($1, $2, $3)
      RETURNING "job_ID"
    `,
    ['Assigned', false, svcId]
  );

  const jobId = jobResult.rows[0].job_ID;

  await pool.query(
    `
      INSERT INTO "new_jobBooking"."work"
        ("job_ID", "booking_ID")
      VALUES ($1, $2)
      ON CONFLICT ("job_ID", "booking_ID") DO NOTHING
    `,
    [jobId, bid]
  );
}

/* ==========================================================================
 * SUBSCRIPTIONS
 * ======================================================================== */

/**
 * GET /api/admin/subscriptions
 */
exports.getSubscriptions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        "subscriptionID",
        name,
        description,
        "recurringServiceID",
        "timeTillNextService",
        "numberOfBookings"
      FROM "payables"."subscription"
      ORDER BY "subscriptionID" DESC
    `);

    return res.status(200).json({
      success: true,
      subscriptions: result.rows
    });
  } catch (err) {
    console.error('Error fetching subscriptions:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions'
    });
  }
};

/**
 * POST /api/admin/subscriptions
 */
exports.addSubscription = async (req, res) => {
  try {
    const {
      name,
      description,
      recurringServiceID,
      timeTillNextService,
      numberOfBookings
    } = req.body;

    const result = await pool.query(
      `
        INSERT INTO "payables"."subscription" (
          name,
          description,
          "recurringServiceID",
          "timeTillNextService",
          "numberOfBookings"
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        name,
        description,
        recurringServiceID,
        timeTillNextService,
        numberOfBookings
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      subscription: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating subscription:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to create subscription'
    });
  }
};

/**
 * PUT /api/admin/subscriptions/:subscriptionID
 */
exports.editSubscription = async (req, res) => {
  try {
    const subscriptionID = normalizeId(req.params.subscriptionID);

    if (!subscriptionID) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription ID'
      });
    }

    const {
      name,
      description,
      recurringServiceID,
      timeTillNextService,
      numberOfBookings
    } = req.body;

    const result = await pool.query(
      `
        UPDATE "payables"."subscription"
        SET
          name = $1,
          description = $2,
          "recurringServiceID" = $3,
          "timeTillNextService" = $4,
          "numberOfBookings" = $5
        WHERE "subscriptionID" = $6
        RETURNING "subscriptionID"
      `,
      [
        name,
        description,
        recurringServiceID,
        timeTillNextService,
        numberOfBookings,
        subscriptionID
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription updated successfully'
    });
  } catch (err) {
    console.error('Error updating subscription:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    });
  }
};

/* ==========================================================================
 * SERVICES
 * ======================================================================== */

/**
 * GET /api/admin/services
 */
exports.getServices = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        service_id,
        service_name
      FROM "payables"."service"
      ORDER BY service_id
    `);

    return res.status(200).json({
      success: true,
      services: result.rows
    });
  } catch (err) {
    console.error('Error fetching services:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch services'
    });
  }
};

/* ==========================================================================
 * PROMOTIONS
 * ======================================================================== */

/**
 * GET /api/admin/promotions
 */
exports.getPromotions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM "payables"."promotions"
      ORDER BY promo_id DESC
    `);

    return res.status(200).json({
      success: true,
      promotions: result.rows
    });
  } catch (err) {
    console.error('Error fetching promotions:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch promotions'
    });
  }
};

/**
 * POST /api/admin/promotions
 */
exports.newPromo = async (req, res) => {
  try {
    const {
      code,
      description,
      discount,
      validFrom,
      validTo,
      promo_name
    } = req.body;

    const result = await pool.query(
      `
        INSERT INTO "payables"."promotions" (
          promo_name,
          promo_start,
          promo_end,
          description,
          "promoCode",
          discount
        )
        VALUES ($1, $2::date, $3::date, $4, $5, $6)
        RETURNING promo_id
      `,
      [
        promo_name,
        validFrom,
        validTo,
        description,
        code,
        discount
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Promo created successfully!',
      promo_id: result.rows[0].promo_id
    });
  } catch (err) {
    console.error('Error creating promotion:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to create promotion',
      error: err.message
    });
  }
};

/**
 * PUT /api/admin/promotions
 */
exports.editPromo = async (req, res) => {
  try {
    const {
      code,
      description,
      discount,
      validFrom,
      validTo,
      promo_name,
      promo_id
    } = req.body;

    const promoId = normalizeId(promo_id);

    if (!promoId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promotion ID'
      });
    }

    const result = await pool.query(
      `
        UPDATE "payables"."promotions"
        SET
          promo_name = $1,
          promo_start = $2::date,
          promo_end = $3::date,
          description = $4,
          "promoCode" = $5,
          discount = $6
        WHERE promo_id = $7
        RETURNING promo_id
      `,
      [
        promo_name,
        validFrom,
        validTo,
        description,
        code,
        discount,
        promoId
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Promo edited successfully!'
    });
  } catch (err) {
    console.error('Error editing promotion:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to edit promotion',
      error: err.message
    });
  }
};

/* ==========================================================================
 * ADMIN BOOKINGS
 * ======================================================================== */

/**
 * GET /api/admin/bookings
 */
exports.getAllBookings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b."booking_ID",
        b."customer_ID",
        b."technician_ID",
        TO_CHAR(b."date", 'YYYY-MM-DD') AS booking_date,
        TO_CHAR(b."time", 'HH24:MI:SS') AS "time",
        b."isFollowup",
        b.location,
        b.status,
        b.comments,
        b.timing,
        b."numberOfUnits",
        b."estimateTotalTime_minutes",
        b."estimateTotalCost",
        b."reasonOfReassignment",
        b."servicesBooked",

        COALESCE(c.customer_name, 'Guest Customer') AS customer_name,
        COALESCE(tech.technician_name, 'Unassigned') AS technician_name

      FROM "new_jobBooking"."Booking" b

      LEFT JOIN "user3"."newCustomer" c
        ON b."customer_ID" = c."customer_ID"

      LEFT JOIN "user3"."technician" tech
        ON b."technician_ID" = tech."technician_ID"

      ORDER BY b."booking_ID" DESC
    `);

    return res.status(200).json({
      success: true,
      bookings: result.rows
    });
  } catch (err) {
    console.error('[Cool Fix] GET Bookings Error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
      bookings: []
    });
  }
};

/**
 * GET /api/admin/bookings/technicians
 */
exports.getTechnicians = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        "technician_ID",
        technician_name
      FROM "user3"."technician"
      ORDER BY "technician_ID"
    `);

    return res.status(200).json({
      success: true,
      technicians: result.rows
    });
  } catch (err) {
    console.error('[Cool Fix] Fetch Technicians Error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* ==========================================================================
 * CLONE BOOKING — ASSISTING TECHNICIAN
 * ======================================================================== */

/**
 * Creates an additional booking for an assisting technician.
 */
exports.cloneBooking = async (req, res) => {
  try {
    const {
      customer_ID,
      technician_ID_2,
      booking_date,
      timing,
      location,
      numberOfUnits
    } = req.body;

    const customerId = normalizeId(customer_ID);
    const technicianId = normalizeId(technician_ID_2);
    const date = normalizeDateToSql(booking_date);

    if (!customerId || !technicianId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Customer, assisting technician and valid booking date are required.'
      });
    }

    const result = await pool.query(
      `
        INSERT INTO "new_jobBooking"."Booking" (
          "customer_ID",
          "technician_ID",
          "date",
          timing,
          location,
          comments,
          status,
          "time",
          "numberOfUnits"
        )
        VALUES (
          $1, $2, $3::date, $4, $5, $6, $7, $8::time, $9
        )
        RETURNING "booking_ID"
      `,
      [
        customerId,
        technicianId,
        date,
        timing,
        location,
        'Assisting another technician',
        'confirmed',
        '12:00:00',
        Number(numberOfUnits) || 0
      ]
    );

    const newBookingId = result.rows[0].booking_ID;

    try {
      await ensureJobLink(newBookingId);
    } catch (err) {
      console.error('[Cool Fix] ensureJobLink (clone) failed:', err.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Assisting booking created successfully.',
      booking_ID: newBookingId
    });
  } catch (err) {
    console.error('[Cool Fix] cloneBooking Error:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to create assisting booking.',
      error: err.message
    });
  }
};

/* ==========================================================================
 * CREATE BOOKING
 * ======================================================================== */

/**
 * POST /api/admin/bookings
 */
exports.createBooking = async (req, res) => {
  try {
    const {
      customer_ID,
      customer_name,
      user_ID,
      technician_ID,
      booking_date,
      time,
      location,
      isFollowup,
      status,
      comments
    } = req.body;

    let finalCustomerId = normalizeId(customer_ID);

    // Create a customer if the supplied customer ID is invalid.
    if (!finalCustomerId) {
      const nameToInsert =
        customer_name && customer_name.trim()
          ? customer_name.trim()
          : 'New Customer';

      /*
       * Your newCustomer schema has a user_ID column.
       * Supply user_ID when creating a new customer if that column
       * is NOT NULL in your Supabase table.
       */
      const userId = normalizeId(user_ID);

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'A valid user_ID is required when creating a new customer.'
        });
      }

      const newCustomer = await pool.query(
        `
          INSERT INTO "user3"."newCustomer" (
            customer_name,
            customer_address,
            "loyaltyPoints",
            bought_packages,
            "user_ID"
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING "customer_ID"
        `,
        [
          nameToInsert,
          'Singapore',
          0,
          0,
          userId
        ]
      );

      finalCustomerId = newCustomer.rows[0].customer_ID;
    } else {
      const customerCheck = await pool.query(
        `
          SELECT "customer_ID"
          FROM "user3"."newCustomer"
          WHERE "customer_ID" = $1
        `,
        [finalCustomerId]
      );

      if (customerCheck.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: `Customer #${finalCustomerId} does not exist.`
        });
      }
    }

    // Validate technician.
    let validTechId = normalizeId(technician_ID);

    if (validTechId) {
      const techCheck = await pool.query(
        `
          SELECT "technician_ID"
          FROM "user3"."technician"
          WHERE "technician_ID" = $1
        `,
        [validTechId]
      );

      if (techCheck.rowCount === 0) {
        validTechId = null;
      }
    }

    const formattedDate =
      normalizeDateToSql(booking_date) || getTodayDate();

    const formattedTime =
      normalizeTimeToSql(time) || '09:00:00';

    const inserted = await pool.query(
      `
        INSERT INTO "new_jobBooking"."Booking" (
          "customer_ID",
          "technician_ID",
          "date",
          "time",
          "isFollowup",
          location,
          status,
          comments
        )
        VALUES (
          $1, $2, $3::date, $4::time, $5, $6, $7, $8
        )
        RETURNING "booking_ID"
      `,
      [
        finalCustomerId,
        validTechId,
        formattedDate,
        formattedTime,
        Boolean(isFollowup),
        location || 'Singapore Main Branch',
        status || 'Pending',
        comments || 'Service booking'
      ]
    );

    const newBookingId = inserted.rows[0].booking_ID;

    try {
      await ensureJobLink(newBookingId);
    } catch (err) {
      console.error('[Cool Fix] ensureJobLink (create) skipped:', err.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Cool Fix booking created successfully!',
      booking_ID: newBookingId
    });
  } catch (err) {
    console.error('[Cool Fix] createBooking Error:', err);

    return res.status(500).json({
      success: false,
      message: `Database Error: ${err.message}`
    });
  }
};

/* ==========================================================================
 * UPDATE BOOKING STATUS / TECHNICIAN / DATE / TIME
 * ======================================================================== */

/**
 * PUT /api/admin/bookings/:bookingId/status
 */
exports.updateBookingStatus = async (req, res) => {
  try {
    const bookingId = normalizeId(req.params.bookingId);

    const {
      status,
      technician_ID,
      technicianId,
      booking_date,
      time,
      technician_ID_2
    } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing Booking ID.'
      });
    }

    const rawTechId =
      technician_ID !== undefined ? technician_ID : technicianId;

    const techIdProvided =
      rawTechId !== undefined &&
      rawTechId !== null &&
      String(rawTechId).trim() !== '';

    let validTechId = normalizeId(rawTechId);

    if (techIdProvided && !validTechId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid technician ID.'
      });
    }

    if (validTechId) {
      const techCheck = await pool.query(
        `
          SELECT "technician_ID"
          FROM "user3"."technician"
          WHERE "technician_ID" = $1
        `,
        [validTechId]
      );

      if (techCheck.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected technician does not exist.'
        });
      }
    }

    let targetDate = normalizeDateToSql(booking_date);
    let targetTime = normalizeTimeToSql(time);

    // Get existing booking date/time when assigning a technician
    // without supplying a replacement date/time.
    if (validTechId && (!targetDate || !targetTime)) {
      const currentBooking = await pool.query(
        `
          SELECT
            TO_CHAR("date", 'YYYY-MM-DD') AS "bookingDate",
            TO_CHAR("time", 'HH24:MI:SS') AS "bookingTime"
          FROM "new_jobBooking"."Booking"
          WHERE "booking_ID" = $1
        `,
        [bookingId]
      );

      if (currentBooking.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found.'
        });
      }

      if (!targetDate) {
        targetDate = currentBooking.rows[0].bookingDate;
      }

      if (!targetTime) {
        targetTime = currentBooking.rows[0].bookingTime;
      }
    }

    // Prevent technician double-booking at the same date AND time.
    if (validTechId && targetDate && targetTime) {
      const conflictCheck = await pool.query(
        `
          SELECT COUNT(*)::int AS clashes
          FROM "new_jobBooking"."Booking"
          WHERE "technician_ID" = $1
            AND "booking_ID" <> $2
            AND "date" = $3::date
            AND "time" = $4::time
            AND LOWER("status") <> 'cancelled'
        `,
        [
          validTechId,
          bookingId,
          targetDate,
          targetTime
        ]
      );

      if (conflictCheck.rows[0].clashes > 0) {
        return res.status(409).json({
          success: false,
          message: 'This technician already has a booking at that exact date and time. Choose a different technician or time slot.'
        });
      }
    }

    const assistingId =
      technician_ID_2 === '' || technician_ID_2 === undefined
        ? null
        : normalizeId(technician_ID_2);

    const updateResult = await pool.query(
      `
        UPDATE "new_jobBooking"."Booking"
        SET
          status = COALESCE($1, status),
          "technician_ID" =
            CASE WHEN $2::boolean THEN $3 ELSE "technician_ID" END,
          "date" = COALESCE($4::date, "date"),
          "time" = COALESCE($5::time, "time"),
          assisting = $6
        WHERE "booking_ID" = $7
        RETURNING "booking_ID"
      `,
      [
        status || null,
        techIdProvided,
        validTechId,
        targetDate,
        targetTime,
        assistingId,
        bookingId
      ]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (techIdProvided && validTechId !== null) {
      try {
        await ensureJobLink(bookingId);
      } catch (err) {
        console.error('[Cool Fix] ensureJobLink (assign) skipped:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Cool Fix booking updated successfully!'
    });
  } catch (err) {
    console.error('[Cool Fix] updateBookingStatus Error:', err);

    return res.status(500).json({
      success: false,
      message: `Database Error: ${err.message}`
    });
  }
};

/* ==========================================================================
 * REASSIGN CONFIRMED BOOKING
 * ======================================================================== */

/**
 * PUT /api/admin/bookings/:bookingId/reassign
 *
 * Changes technician_ID and reasonOfReassignment only.
 */
exports.reassignConfirmedBooking = async (req, res) => {
  try {
    const bookingId = normalizeId(req.params.bookingId);
    const { technician_ID, reason } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Booking ID.'
      });
    }

    const technicianId = normalizeId(technician_ID);

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        message: 'A valid technician must be selected.'
      });
    }

    const cleanReason = String(reason || '').trim();

    if (!cleanReason) {
      return res.status(400).json({
        success: false,
        message: 'A reason for reassignment is required.'
      });
    }

    const bookingResult = await pool.query(
      `
        SELECT
          "booking_ID",
          "technician_ID",
          "date",
          TO_CHAR("time", 'HH24:MI:SS') AS "bookingTime",
          LOWER(BTRIM(status)) AS "bookingStatus"
        FROM "new_jobBooking"."Booking"
        WHERE "booking_ID" = $1
      `,
      [bookingId]
    );

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    const booking = bookingResult.rows[0];

    if (booking.bookingStatus !== 'confirmed') {
      return res.status(409).json({
        success: false,
        message: 'Only confirmed bookings can have their technician reassigned.'
      });
    }

    if (Number(booking.technician_ID) === technicianId) {
      return res.status(400).json({
        success: false,
        message: 'Choose a different technician.'
      });
    }

    const techCheck = await pool.query(
      `
        SELECT "technician_ID"
        FROM "user3"."technician"
        WHERE "technician_ID" = $1
      `,
      [technicianId]
    );

    if (techCheck.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected technician does not exist.'
      });
    }

    const conflictResult = await pool.query(
      `
        SELECT COUNT(*)::int AS clashes
        FROM "new_jobBooking"."Booking"
        WHERE "technician_ID" = $1
          AND "booking_ID" <> $2
          AND "date" = $3::date
          AND "time" = $4::time
          AND LOWER(BTRIM(status)) <> 'cancelled'
      `,
      [
        technicianId,
        bookingId,
        booking.date,
        booking.bookingTime
      ]
    );

    if (conflictResult.rows[0].clashes > 0) {
      return res.status(409).json({
        success: false,
        message: 'This technician already has a booking at that date and time.'
      });
    }

    const updateResult = await pool.query(
      `
        UPDATE "new_jobBooking"."Booking"
        SET
          "technician_ID" = $1,
          "reasonOfReassignment" = $2
        WHERE "booking_ID" = $3
          AND LOWER(BTRIM(status)) = 'confirmed'
        RETURNING "booking_ID"
      `,
      [
        technicianId,
        cleanReason,
        bookingId
      ]
    );

    if (updateResult.rowCount === 0) {
      return res.status(409).json({
        success: false,
        message: 'The booking could not be reassigned. Refresh and try again.'
      });
    }

    try {
      await ensureJobLink(bookingId);
    } catch (err) {
      console.error('[Cool Fix] ensureJobLink failed:', err.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Technician reassigned successfully.'
    });
  } catch (err) {
    console.error('[Cool Fix] reassignConfirmedBooking error:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to reassign technician.',
      error: err.message
    });
  }
};

/* ==========================================================================
 * RESCHEDULE REQUESTED BOOKING
 * ======================================================================== */

/**
 * PUT /api/admin/bookings/:bookingId/reschedule
 *
 * Changes the booking time and technician.
 */
exports.rescheduleRequestedBooking = async (req, res) => {
  try {
    const bookingId = normalizeId(req.params.bookingId);
    const { time, technician_ID } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Booking ID.'
      });
    }

    const targetTime = normalizeTimeToSql(time);

    if (!targetTime) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking time.'
      });
    }

    const technicianId = normalizeId(technician_ID);

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        message: 'A valid new technician is required.'
      });
    }

    const bookingResult = await pool.query(
      `
        SELECT
          "booking_ID",
          "technician_ID",
          "date",
          TO_CHAR("time", 'HH24:MI:SS') AS "bookingTime",
          LOWER(BTRIM(status)) AS "bookingStatus"
        FROM "new_jobBooking"."Booking"
        WHERE "booking_ID" = $1
      `,
      [bookingId]
    );

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    const booking = bookingResult.rows[0];

    const allowedStatuses = [
      'request_reschedule',
      'reschedule_requested'
    ];

    if (!allowedStatuses.includes(booking.bookingStatus)) {
      return res.status(409).json({
        success: false,
        message: 'This booking is not awaiting rescheduling.'
      });
    }

    if (
      targetTime.slice(0, 5) ===
      String(booking.bookingTime).slice(0, 5)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Choose a different booking time.'
      });
    }

    const techCheck = await pool.query(
      `
        SELECT "technician_ID"
        FROM "user3"."technician"
        WHERE "technician_ID" = $1
      `,
      [technicianId]
    );

    if (techCheck.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected technician does not exist.'
      });
    }

    const conflictResult = await pool.query(
      `
        SELECT COUNT(*)::int AS clashes
        FROM "new_jobBooking"."Booking"
        WHERE "technician_ID" = $1
          AND "booking_ID" <> $2
          AND "date" = $3::date
          AND "time" = $4::time
          AND LOWER(BTRIM(status)) <> 'cancelled'
      `,
      [
        technicianId,
        bookingId,
        booking.date,
        targetTime
      ]
    );

    if (conflictResult.rows[0].clashes > 0) {
      return res.status(409).json({
        success: false,
        message: 'The assigned technician already has a booking at that date and time.'
      });
    }

    const updateResult = await pool.query(
      `
        UPDATE "new_jobBooking"."Booking"
        SET
          "time" = $1::time,
          "technician_ID" = $2,
          status = 'Assigned'
        WHERE "booking_ID" = $3
          AND LOWER(BTRIM(status))
              IN ('request_reschedule', 'reschedule_requested')
        RETURNING "booking_ID"
      `,
      [
        targetTime,
        technicianId,
        bookingId
      ]
    );

    if (updateResult.rowCount === 0) {
      return res.status(409).json({
        success: false,
        message: 'The booking could not be rescheduled. Refresh and try again.'
      });
    }

    try {
      await ensureJobLink(bookingId);
    } catch (err) {
      console.error('[Cool Fix] ensureJobLink (reschedule) failed:', err.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Booking time updated successfully.'
    });
  } catch (err) {
    console.error('[Cool Fix] rescheduleRequestedBooking error:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to update booking time.',
      error: err.message
    });
  }
};

/* ==========================================================================
 * SUBMIT THREE RESCHEDULING ALTERNATIVES
 * ======================================================================== */

/**
 * PUT /api/admin/bookings/:bookingId/alternatives
 *
 * Saves three alternatives and changes status to request_reschedule.
 */
exports.submitBookingAlternatives = async (req, res) => {
  try {
    const bookingId = normalizeId(req.params.bookingId);
    const { alternatives } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Booking ID.'
      });
    }

    if (!Array.isArray(alternatives) || alternatives.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Exactly three booking alternatives are required.'
      });
    }

    for (const [index, alternative] of alternatives.entries()) {
      if (
        !normalizeDateToSql(alternative.date) ||
        !normalizeTimeToSql(alternative.time) ||
        !normalizeId(alternative.technician_ID)
      ) {
        return res.status(400).json({
          success: false,
          message: `Alternative ${index + 1} has invalid date, time or technician.`
        });
      }
    }

    const values = [
      normalizeDateToSql(alternatives[0].date),
      normalizeTimeToSql(alternatives[0].time),
      normalizeId(alternatives[0].technician_ID),
      normalizeId(alternatives[0].assisting),

      normalizeDateToSql(alternatives[1].date),
      normalizeTimeToSql(alternatives[1].time),
      normalizeId(alternatives[1].technician_ID),
      normalizeId(alternatives[1].assisting),

      normalizeDateToSql(alternatives[2].date),
      normalizeTimeToSql(alternatives[2].time),
      normalizeId(alternatives[2].technician_ID),
      normalizeId(alternatives[2].assisting),

      normalizeDateToSql(alternatives[0].date),
      bookingId
    ];

    const result = await pool.query(
      `
        UPDATE "new_jobBooking"."Booking"
        SET
          "RR1_date" = $1::date,
          "RR1_time" = $2,
          "RR1_technician" = $3,
          "RR1_assisting" = $4,

          "RR2_date" = $5::date,
          "RR2_time" = $6,
          "RR2_technician" = $7,
          "RR2_assisting" = $8,

          "RR3_date" = $9::date,
          "RR3_time" = $10,
          "RR3_technician" = $11,
          "RR3_assisting" = $12,

          "RR_expiry" = $13::date,
          status = 'request_reschedule'

        WHERE "booking_ID" = $14
        RETURNING "booking_ID"
      `,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Booking ${bookingId} was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking alternatives submitted successfully.'
    });
  } catch (err) {
    console.error('[submitBookingAlternatives] Error:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to submit booking alternatives.',
      error: err.message
    });
  }
};

/* ==========================================================================
 * CREATE RESERVED RESCHEDULING SLOTS
 * ======================================================================== */

/**
 * Creates six reserved placeholder bookings:
 *   3 primary technician slots
 *   3 assisting technician slots
 *
 * These are placeholders with status RR_reserved.
 */
exports.makeReservedSlots = async (req, res) => {
  try {
    const { customer_ID, alternativesWithMore } = req.body;

    const customerId = normalizeId(customer_ID);

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'A valid customer ID is required.'
      });
    }

    if (
      !Array.isArray(alternativesWithMore) ||
      alternativesWithMore.length !== 3
    ) {
      return res.status(400).json({
        success: false,
        message: 'Exactly three alternatives are required.'
      });
    }

    for (const [index, alternative] of alternativesWithMore.entries()) {
      if (
        !normalizeDateToSql(alternative.date) ||
        !normalizeTimeToSql(alternative.time) ||
        !normalizeId(alternative.technician_ID)
      ) {
        return res.status(400).json({
          success: false,
          message: `Alternative ${index + 1} has invalid date, time or technician.`
        });
      }
    }

    const rowsToInsert = [];

    // First three: primary technicians.
    for (const alternative of alternativesWithMore) {
      rowsToInsert.push({
        date: normalizeDateToSql(alternative.date),
        timing: normalizeTimeToSql(alternative.time),
        technicianId: normalizeId(alternative.technician_ID)
      });
    }

    // Next three: assisting technicians.
    for (const alternative of alternativesWithMore) {
      rowsToInsert.push({
        date: normalizeDateToSql(alternative.date),
        timing: normalizeTimeToSql(alternative.time),
        technicianId: normalizeId(alternative.assisting)
      });
    }

    const values = [];
    const placeholders = [];

    for (const row of rowsToInsert) {
      const start = values.length;

      values.push(
        customerId,
        row.date,
        row.timing,
        'RR reserving...',
        'RESERVED SLOT',
        row.technicianId,
        'RR_reserved',
        '12:00:00',
        0
      );

      placeholders.push(
        `(
          $${start + 1},
          $${start + 2}::date,
          $${start + 3},
          $${start + 4},
          $${start + 5},
          $${start + 6},
          $${start + 7},
          $${start + 8}::time,
          $${start + 9}
        )`
      );
    }

    const insertQuery = `
      INSERT INTO "new_jobBooking"."Booking" (
        "customer_ID",
        "date",
        timing,
        location,
        comments,
        "technician_ID",
        status,
        "time",
        "numberOfUnits"
      )
      VALUES ${placeholders.join(', ')}
      RETURNING "booking_ID"
    `;

    const result = await pool.query(insertQuery, values);

    return res.status(201).json({
      success: true,
      message: 'Reserved slots created successfully.',
      booking_IDs: result.rows.map(row => row.booking_ID)
    });
  } catch (err) {
    console.error('[makeReservedSlots] Error:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to create reserved slots.',
      error: err.message
    });
  }
};