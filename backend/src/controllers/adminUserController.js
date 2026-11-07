/**
 * Cool Fix - Admin User Controller
 * Supabase / PostgreSQL version
 *
 * Tables:
 *   "user3"."topUser"
 *   "user3"."admin"
 *   "user3"."technician"
 *   "user3"."newCustomer"
 *   "new_jobBooking"."Booking"
 */

const pool = require('../config/supabaseDb');
const bcrypt = require('bcryptjs');

/* --------------------------------------------------------------------------
 * Transaction helper
 * ------------------------------------------------------------------------ */

async function withTransaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await callback(client);

    await client.query('COMMIT');

    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/* ==========================================================================
 * ADMIN MANAGEMENT
 * ======================================================================== */

/**
 * POST /api/admin/users/admin
 */
exports.addAdmin = async (req, res) => {
  try {
    console.log('im at make admin controller');

    const { admin_name, password } = req.body;

    if (!admin_name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin name and password are required.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUserId = await withTransaction(async (client) => {
      // STEP 1: Create user account.
      const userResult = await client.query(
        `
          INSERT INTO "user3"."topUser"
            (username, salt, hash, "accountType")
          VALUES
            ($1, $2, $3, 'Admin')
          RETURNING "user_ID"
        `,
        [admin_name, salt, hash]
      );

      const userId = userResult.rows[0].user_ID;

      // STEP 2: Create admin record linked to user account.
      await client.query(
        `
          INSERT INTO "user3"."admin"
            (admin_name, "user_ID")
          VALUES
            ($1, $2)
        `,
        [admin_name, userId]
      );

      return userId;
    });

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully!',
      user_ID: newUserId
    });

  } catch (err) {
    console.error('[Cool Fix] POST admin Error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.editAdmin = async (req, res) => {
  // Not implemented in the original controller.
};

/**
 * GET /api/admin/users/admins
 */
exports.getAdmins = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM "user3"."admin"
    `);

    return res.status(200).json({
      success: true,
      admins: result.rows || []
    });

  } catch (err) {
    console.error('[Cool Fix] GET admin Error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
      admins: []
    });
  }
};

/* ==========================================================================
 * CUSTOMERS MANAGEMENT
 * ======================================================================== */

/**
 * GET /api/admin/users/customers
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        "customer_ID",
        customer_name,
        customer_aircons,
        "loyaltyPoints",
        COALESCE(customer_address, 'Singapore') AS customer_address,
        bought_packages,
        "user_ID",
        "totalBookings",
        "totalSpent"
      FROM "user3"."newCustomer"
      ORDER BY "customer_ID" DESC
    `);

    return res.status(200).json({
      success: true,
      customers: result.rows || []
    });

  } catch (err) {
    console.error('[Cool Fix] GET Customers Error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
      customers: []
    });
  }
};

/**
 * POST /api/admin/users/customers
 *
 * Creates topUser login account + newCustomer record
 * within one transaction.
 */
exports.createCustomer = async (req, res) => {
  try {
    const {
      customer_name,
      customer_address,
      loyaltyPoints
    } = req.body;

    const custName = String(customer_name || 'New Customer').trim();
    const custAddress = String(customer_address || 'Singapore').trim();
    const custPoints = parseInt(loyaltyPoints, 10) || 0;

    const defaultUsername = custName.toLowerCase().replace(/\s+/g, '_');
    const defaultPassword = 'customer123';

    const existingUser = await pool.query(
      `
        SELECT "user_ID"
        FROM "user3"."topUser"
        WHERE LOWER(username) = LOWER($1)
      `,
      [defaultUsername]
    );

    if (existingUser.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Username "${defaultUsername}" already taken. Please register manually.`
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(defaultPassword, salt);

    const created = await withTransaction(async (client) => {
      // STEP 1: Create login account.
      const userResult = await client.query(
        `
          INSERT INTO "user3"."topUser"
            (username, salt, hash, "accountType", "isDeleted")
          VALUES
            ($1, $2, $3, $4, $5)
          RETURNING "user_ID"
        `,
        [
          defaultUsername,
          salt,
          hash,
          'Customer',
          false
        ]
      );

      const newUserId = userResult.rows[0].user_ID;

      // STEP 2: Create customer record.
      const customerResult = await client.query(
        `
          INSERT INTO "user3"."newCustomer" (
            customer_name,
            customer_address,
            customer_aircons,
            "loyaltyPoints",
            bought_packages,
            "user_ID"
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING "customer_ID"
        `,
        [
          custName,
          custAddress,
          1,
          custPoints,
          0,
          newUserId
        ]
      );

      return {
        userId: newUserId,
        customerId: customerResult.rows[0].customer_ID
      };
    });

    return res.status(201).json({
      success: true,
      message: `Customer created! Login: ${defaultUsername} / ${defaultPassword}`,
      customer_ID: created.customerId,
      user_ID: created.userId,
      username: defaultUsername
    });

  } catch (err) {
    console.error('[Cool Fix] POST Customer Error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * PUT /api/admin/users/customers/:id
 */
exports.updateCustomer = async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    const {
      customer_name,
      customer_address,
      loyaltyPoints
    } = req.body;

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID.'
      });
    }

    // Update customer record.
    const customerResult = await pool.query(
      `
        UPDATE "user3"."newCustomer"
        SET
          customer_name = COALESCE($1, customer_name),
          customer_address = COALESCE($2, customer_address),
          "loyaltyPoints" = COALESCE($3, "loyaltyPoints")
        WHERE "customer_ID" = $4
        RETURNING "user_ID"
      `,
      [
        customer_name || null,
        customer_address || null,
        loyaltyPoints !== undefined
          ? (parseInt(loyaltyPoints, 10) || 0)
          : null,
        customerId
      ]
    );

    if (customerResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.'
      });
    }

    // Update linked login username if customer name changed.
    if (customer_name) {
      await pool.query(
        `
          UPDATE "user3"."topUser" AS u
          SET username = $1
          FROM "user3"."newCustomer" AS c
          WHERE u."user_ID" = c."user_ID"
            AND c."customer_ID" = $2
        `,
        [customer_name, customerId]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully!'
    });

  } catch (err) {
    console.error('[Cool Fix] PUT Customer Error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * DELETE /api/admin/users/customers/:id
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID.'
      });
    }

    const findUser = await pool.query(
      `
        SELECT "user_ID"
        FROM "user3"."newCustomer"
        WHERE "customer_ID" = $1
      `,
      [customerId]
    );

    if (findUser.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.'
      });
    }

    const userId = findUser.rows[0].user_ID;

    await withTransaction(async (client) => {
      await client.query(
        `
          DELETE FROM "user3"."newCustomer"
          WHERE "customer_ID" = $1
        `,
        [customerId]
      );

      if (userId) {
        await client.query(
          `
            UPDATE "user3"."topUser"
            SET "isDeleted" = TRUE
            WHERE "user_ID" = $1
          `,
          [userId]
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Customer removed successfully!'
    });

  } catch (err) {
    console.error('[Cool Fix] DELETE Customer Error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* ==========================================================================
 * TECHNICIANS MANAGEMENT
 * ======================================================================== */

/**
 * GET /api/admin/users/technicians
 */
exports.getAllTechnicians = async (req, res) => {
  try {
    const query = `
      SELECT
        t."technician_ID",
        t."user_ID",
        COALESCE(t.technician_name, 'Technician') AS username,
        COALESCE(u."phoneNumber", 'N/A') AS "phoneNumber",
        COALESCE(t.specialty, 'Aircon Servicing') AS specialty,
        COUNT(b."booking_ID")::int AS "jobsDone"

      FROM "user3"."technician" t

      LEFT JOIN "user3"."topUser" u
        ON t."user_ID" = u."user_ID"

      LEFT JOIN "new_jobBooking"."Booking" b
        ON t."technician_ID" = b."technician_ID"

      GROUP BY
        t."technician_ID",
        t."user_ID",
        t.technician_name,
        u."phoneNumber",
        t.specialty

      ORDER BY t."technician_ID" DESC
    `;

    const result = await pool.query(query);

    return res.status(200).json({
      success: true,
      technicians: result.rows || []
    });

  } catch (err) {
    console.error('[Cool Fix] GET Technicians Error:', err.message);

    // Keep the original fallback query if the full query fails.
    try {
      const fallbackQuery = `
        SELECT
          "technician_ID",
          "user_ID",
          COALESCE(technician_name, 'Technician') AS username,
          'N/A' AS "phoneNumber",
          COALESCE(specialty, 'Aircon Servicing') AS specialty,
          0 AS "jobsDone"
        FROM "user3"."technician"
        ORDER BY "technician_ID" DESC
      `;

      const fallbackResult = await pool.query(fallbackQuery);

      return res.status(200).json({
        success: true,
        technicians: fallbackResult.rows || []
      });

    } catch (fallbackErr) {
      console.error(
        '[Cool Fix] GET Technicians Fallback Error:',
        fallbackErr.message
      );

      return res.status(500).json({
        success: false,
        message: fallbackErr.message,
        technicians: []
      });
    }
  }
};

/**
 * POST /api/admin/users/technicians
 */
exports.createTechnician = async (req, res) => {
  try {
    const {
      username,
      name,
      password,
      phoneNumber,
      phone,
      specialty
    } = req.body;

    const techName = String(username || name || 'New Technician').trim();
    const techPhone = String(phoneNumber || phone || 'N/A').trim();
    const rawPassword = String(password || 'tech123').trim();
    const techSpecialty = String(specialty || 'Aircon Servicing').trim();

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    const created = await withTransaction(async (client) => {
      // STEP 1: Create login account.
      const userResult = await client.query(
        `
          INSERT INTO "user3"."topUser" (
            username,
            salt,
            hash,
            "accountType",
            "isDeleted",
            "phoneNumber",
            joined
          )
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          RETURNING "user_ID"
        `,
        [
          techName,
          salt,
          hash,
          'Technician',
          false,
          techPhone
        ]
      );

      const newUserId = userResult.rows[0]?.user_ID;

      if (!newUserId) {
        throw new Error('Failed to create topUser account record.');
      }

      // STEP 2: Create technician record.
      const techResult = await client.query(
        `
          INSERT INTO "user3"."technician" (
            technician_name,
            technician_rating,
            "user_ID",
            specialty,
            "jobsDone"
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING "technician_ID"
        `,
        [
          techName,
          5,
          newUserId,
          techSpecialty,
          0
        ]
      );

      const newTechId = techResult.rows[0]?.technician_ID;

      return {
        userId: newUserId,
        technicianId: newTechId
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Technician created successfully!',
      technician_ID: created.technicianId,
      user_ID: created.userId
    });

  } catch (err) {
    console.error('[Cool Fix] POST Technician Error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * PUT /api/admin/users/technicians/:id
 */
exports.updateTechnician = async (req, res) => {
  try {
    const technicianId = Number(req.params.id);

    const {
      username,
      phoneNumber,
      specialty
    } = req.body;

    if (!Number.isInteger(technicianId) || technicianId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid technician ID.'
      });
    }

    const updateTechResult = await pool.query(
      `
        UPDATE "user3"."technician"
        SET
          technician_name = COALESCE($1, technician_name),
          specialty = COALESCE($2, specialty)
        WHERE "technician_ID" = $3
        RETURNING "user_ID"
      `,
      [
        username || null,
        specialty || null,
        technicianId
      ]
    );

    if (updateTechResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found.'
      });
    }

    // Update the linked login account.
    await pool.query(
      `
        UPDATE "user3"."topUser" AS u
        SET
          "phoneNumber" = COALESCE($1, u."phoneNumber"),
          username = COALESCE($2, u.username)
        FROM "user3"."technician" AS t
        WHERE u."user_ID" = t."user_ID"
          AND t."technician_ID" = $3
      `,
      [
        phoneNumber || null,
        username || null,
        technicianId
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Technician updated successfully!'
    });

  } catch (err) {
    console.error('[Cool Fix] PUT Technician Error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * DELETE /api/admin/users/technicians/:id
 */
exports.deleteTechnician = async (req, res) => {
  try {
    const technicianId = Number(req.params.id);

    if (!Number.isInteger(technicianId) || technicianId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid technician ID.'
      });
    }

    const findUser = await pool.query(
      `
        SELECT "user_ID"
        FROM "user3"."technician"
        WHERE "technician_ID" = $1
      `,
      [technicianId]
    );

    if (findUser.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found.'
      });
    }

    const userId = findUser.rows[0].user_ID;

    await withTransaction(async (client) => {
      await client.query(
        `
          DELETE FROM "user3"."technician"
          WHERE "technician_ID" = $1
        `,
        [technicianId]
      );

      if (userId) {
        await client.query(
          `
            UPDATE "user3"."topUser"
            SET "isDeleted" = TRUE
            WHERE "user_ID" = $1
          `,
          [userId]
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Technician removed successfully!'
    });

  } catch (err) {
    console.error('[Cool Fix] DELETE Technician Error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};