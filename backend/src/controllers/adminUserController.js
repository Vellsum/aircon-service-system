/**
 * Cool Fix - Admin User Controller
 * Manages [user3].[topUser], [user3].[technician], and [user3].[newCustomer]
 */

const { poolPromise, sql } = require('../config/db');
const bcrypt = require('bcryptjs');

// ==========================================
// CUSTOMERS MANAGEMENT
// ==========================================

/**
 * GET /api/admin/users/customers
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, customers: [] });

    const query = `
      SELECT 
        customer_ID,
        customer_name,
        customer_aircons,
        loyaltyPoints,
        ISNULL(customer_address, 'Singapore') AS customer_address,
        bought_packages,
        user_ID,
        totalBookings,
        totalSpent
      FROM [user3].[newCustomer]
      ORDER BY customer_ID DESC
    `;

    const result = await pool.request().query(query);
    res.status(200).json({ success: true, customers: result.recordset || [] });
  } catch (err) {
    console.error('[Cool Fix] GET Customers Error:', err.message);
    res.status(500).json({ success: false, message: err.message, customers: [] });
  }
};

/**
 * POST /api/admin/users/customers
 * Creates topUser login account + newCustomer record within a transaction
 */
exports.createCustomer = async (req, res) => {
  let transaction;
  try {
    const { customer_name, customer_address, loyaltyPoints } = req.body;

    const custName = String(customer_name || 'New Customer').trim();
    const custAddress = String(customer_address || 'Singapore').trim();
    const custPoints = parseInt(loyaltyPoints, 10) || 0;

    const defaultUsername = custName.toLowerCase().replace(/\s+/g, '_');
    const defaultPassword = 'customer123';

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    const existingUser = await pool.request()
      .input('username', sql.VarChar(100), defaultUsername)
      .query(`SELECT user_ID FROM [user3].[topUser] WHERE LOWER(username) = LOWER(@username)`);

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ success: false, message: `Username "${defaultUsername}" already taken. Please register manually.` });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(defaultPassword, salt);

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const userRequest = new sql.Request(transaction);
    const userResult = await userRequest
      .input('username', sql.VarChar(100), defaultUsername)
      .input('salt', sql.VarChar(255), salt)
      .input('hash', sql.VarChar(255), hash)
      .input('accountType', sql.VarChar(100), 'Customer')
      .input('isDeleted', sql.Bit, 0)
      .query(`
        INSERT INTO [user3].[topUser] (username, salt, hash, accountType, isDeleted)
        OUTPUT INSERTED.user_ID
        VALUES (@username, @salt, @hash, @accountType, @isDeleted)
      `);

    const newUserId = userResult.recordset[0].user_ID;

    const custRequest = new sql.Request(transaction);
    const custResult = await custRequest
      .input('customer_name', sql.VarChar(100), custName)
      .input('customer_address', sql.VarChar(100), custAddress)
      .input('customer_aircons', sql.Int, 1)
      .input('loyaltyPoints', sql.Int, custPoints)
      .input('bought_packages', sql.Int, 0)
      .input('user_ID', sql.Int, newUserId)
      .query(`
        INSERT INTO [user3].[newCustomer] (customer_name, customer_address, customer_aircons, loyaltyPoints, bought_packages, user_ID)
        OUTPUT INSERTED.customer_ID
        VALUES (@customer_name, @customer_address, @customer_aircons, @loyaltyPoints, @bought_packages, @user_ID)
      `);

    const newCustomerId = custResult.recordset[0].customer_ID;

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: `Customer created! Login: ${defaultUsername} / ${defaultPassword}`,
      customer_ID: newCustomerId,
      user_ID: newUserId,
      username: defaultUsername,
    });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('[Cool Fix] POST Customer Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/admin/users/customers/:id
 */
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_address, loyaltyPoints } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.VarChar(100), customer_name)
      .input('address', sql.VarChar(100), customer_address)
      .input('points', sql.Int, parseInt(loyaltyPoints, 10) || 0)
      .query(`
        UPDATE [user3].[newCustomer]
        SET customer_name = ISNULL(@name, customer_name),
            customer_address = ISNULL(@address, customer_address),
            loyaltyPoints = ISNULL(@points, loyaltyPoints)
        WHERE customer_ID = @id
      `);

    if (customer_name) {
      await pool.request()
        .input('id', sql.Int, id)
        .input('name', sql.VarChar(100), customer_name)
        .query(`
          UPDATE u
          SET u.username = @name
          FROM [user3].[topUser] u
          JOIN [user3].[newCustomer] c ON u.user_ID = c.user_ID
          WHERE c.customer_ID = @id
        `);
    }

    return res.status(200).json({ success: true, message: 'Customer updated successfully!' });
  } catch (err) {
    console.error('[Cool Fix] PUT Customer Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/admin/users/customers/:id
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    const findUser = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT user_ID FROM [user3].[newCustomer] WHERE customer_ID = @id`);

    const userId = findUser.recordset[0]?.user_ID;

    await pool.request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM [user3].[newCustomer] WHERE customer_ID = @id`);

    if (userId) {
      await pool.request()
        .input('userId', sql.Int, userId)
        .query(`UPDATE [user3].[topUser] SET isDeleted = 1 WHERE user_ID = @userId`);
    }

    return res.status(200).json({ success: true, message: 'Customer removed successfully!' });
  } catch (err) {
    console.error('[Cool Fix] DELETE Customer Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// TECHNICIANS MANAGEMENT
// ==========================================

/**
 * GET /api/admin/users/technicians
 */
exports.getAllTechnicians = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, technicians: [] });

    const query = `
      SELECT 
        t.technician_ID,
        t.user_ID,
        ISNULL(t.technician_name, 'Technician') AS username,
        ISNULL(u.phoneNumber, 'N/A') AS phoneNumber,
        ISNULL(t.specialty, 'Aircon Servicing') AS specialty,
        COUNT(b.booking_ID) AS jobsDone
      FROM [user3].[technician] t
      LEFT JOIN [user3].[topUser] u ON t.user_ID = u.user_ID
      LEFT JOIN [new_jobBooking].[Booking] b ON t.technician_ID = b.technician_ID
      GROUP BY t.technician_ID, t.user_ID, t.technician_name, u.phoneNumber, t.specialty
      ORDER BY t.technician_ID DESC
    `;

    const result = await pool.request().query(query);

    return res.status(200).json({
      success: true,
      technicians: result.recordset || []
    });
  } catch (err) {
    console.error('[Cool Fix] GET Technicians Error:', err.message);

    try {
      const pool = await poolPromise;
      const fallbackQuery = `
        SELECT 
          technician_ID,
          user_ID,
          ISNULL(technician_name, 'Technician') AS username,
          'N/A' AS phoneNumber,
          ISNULL(specialty, 'Aircon Servicing') AS specialty,
          0 AS jobsDone
        FROM [user3].[technician]
        ORDER BY technician_ID DESC
      `;
      const fallbackResult = await pool.request().query(fallbackQuery);
      return res.status(200).json({
        success: true,
        technicians: fallbackResult.recordset || []
      });
    } catch (fallbackErr) {
      console.error('[Cool Fix] GET Technicians Fallback Error:', fallbackErr.message);
      res.status(500).json({ success: false, message: fallbackErr.message, technicians: [] });
    }
  }
};

/**
 * POST /api/admin/users/technicians
 */
exports.createTechnician = async (req, res) => {
  let transaction;
  try {
    const { username, name, password, phoneNumber, phone, specialty } = req.body;
    
    const techName = String(username || name || 'New Technician').trim();
    const techPhone = String(phoneNumber || phone || 'N/A').trim();
    const rawPassword = String(password || 'tech123').trim();
    const techSpecialty = String(specialty || 'Aircon Servicing').trim();

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const userRequest = new sql.Request(transaction);
    const userQuery = `
      INSERT INTO [user3].[topUser] 
        (username, salt, hash, accountType, isDeleted, phoneNumber, joined)
      VALUES 
        (@username, @salt, @hash, 'Technician', 0, @phone, GETDATE());
      
      SELECT SCOPE_IDENTITY() AS newUserId;
    `;

    userRequest.input('username', sql.VarChar(100), techName);
    userRequest.input('salt', sql.VarChar(255), salt);
    userRequest.input('hash', sql.VarChar(255), hash);
    userRequest.input('phone', sql.VarChar(50), techPhone);

    const userResult = await userRequest.query(userQuery);
    const newUserId = userResult.recordset[0]?.newUserId;

    if (!newUserId) {
      throw new Error('Failed to create topUser account record');
    }

    const techRequest = new sql.Request(transaction);
    const techQuery = `
      INSERT INTO [user3].[technician] 
        (technician_name, technician_rating, user_ID, specialty, jobsDone)
      VALUES 
        (@name, 5, @userId, @specialty, 0);
      
      SELECT SCOPE_IDENTITY() AS newTechId;
    `;

    techRequest.input('name', sql.VarChar(100), techName);
    techRequest.input('userId', sql.Int, newUserId);
    techRequest.input('specialty', sql.VarChar(100), techSpecialty);

    const techResult = await techRequest.query(techQuery);
    const newTechId = techResult.recordset[0]?.newTechId;

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: 'Technician created successfully!',
      technician_ID: newTechId,
      user_ID: newUserId
    });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('[Cool Fix] POST Technician Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/admin/users/technicians/:id
 */
exports.updateTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, phoneNumber, specialty } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    const updateTechQuery = `
      UPDATE [user3].[technician]
      SET technician_name = ISNULL(@name, technician_name),
          specialty = ISNULL(@specialty, specialty)
      WHERE technician_ID = @id
    `;

    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.VarChar(100), username)
      .input('specialty', sql.VarChar(100), specialty)
      .query(updateTechQuery);

    const updateUserQuery = `
      UPDATE u
      SET u.phoneNumber = ISNULL(@phone, u.phoneNumber),
          u.username = ISNULL(@name, u.username)
      FROM [user3].[topUser] u
      JOIN [user3].[technician] t ON u.user_ID = t.user_ID
      WHERE t.technician_ID = @id
    `;

    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.VarChar(100), username)
      .input('phone', sql.VarChar(50), phoneNumber)
      .query(updateUserQuery);

    return res.status(200).json({ success: true, message: 'Technician updated successfully!' });
  } catch (err) {
    console.error('[Cool Fix] PUT Technician Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/admin/users/technicians/:id
 */
exports.deleteTechnician = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    const findUser = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT user_ID FROM [user3].[technician] WHERE technician_ID = @id`);

    const userId = findUser.recordset[0]?.user_ID;

    await pool.request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM [user3].[technician] WHERE technician_ID = @id`);

    if (userId) {
      await pool.request()
        .input('userId', sql.Int, userId)
        .query(`UPDATE [user3].[topUser] SET isDeleted = 1 WHERE user_ID = @userId`);
    }

    return res.status(200).json({ success: true, message: 'Technician removed successfully!' });
  } catch (err) {
    console.error('[Cool Fix] DELETE Technician Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};