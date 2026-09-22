const { poolPromise, sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. REGISTER NEW CUSTOMER ONLY
exports.register = async (req, res) => {
    try {
        const { username, password, customer_name, customer_address } = req.body;

        if (!username || !password || !customer_name) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please fill in all required fields (username, password, full name).' 
            });
        }

        const pool = await poolPromise;

        // Check if username already exists
        const existingUser = await pool.request()
            .input('username', sql.VarChar(100), username)
            .query(`SELECT user_ID FROM [user3].[topUser] WHERE LOWER(username) = LOWER(@username)`);

        if (existingUser.recordset.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username is already taken. Please choose another.' 
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // STEP 1: Insert into Parent Table (topUser) - Strictly Customer
            const parentResult = await transaction.request()
                .input('username', sql.VarChar(100), username)
                .input('salt', sql.VarChar(255), salt)
                .input('hash', sql.VarChar(255), hash)
                .input('accountType', sql.VarChar(100), 'Customer')
                .input('isDeleted', sql.Bit, 0)
                .query(`
                    INSERT INTO [user3].[topUser] (username, salt, hash, accountType, isDeleted)
                    OUTPUT INSERTED.user_ID
                    VALUES (@username, @salt, @hash, @accountType, @isDeleted)
                `);

            const newUserId = parentResult.recordset[0].user_ID;

            // STEP 2: Insert into Child Table (newCustomer)
            const childResult = await transaction.request()
                .input('customer_name', sql.VarChar(100), customer_name)
                .input('customer_address', sql.VarChar(100), customer_address || 'Singapore')
                .input('customer_aircons', sql.Int, 1)
                .input('loyaltyPoints', sql.Int, 0)
                .input('bought_packages', sql.Int, 0)
                .input('user_ID', sql.Int, newUserId)
                .query(`
                    INSERT INTO [user3].[newCustomer] (customer_name, customer_address, customer_aircons, loyaltyPoints, bought_packages, user_ID)
                    OUTPUT INSERTED.customer_ID
                    VALUES (@customer_name, @customer_address, @customer_aircons, @loyaltyPoints, @bought_packages, @user_ID)
                `);

            const newCustomerId = childResult.recordset[0].customer_ID;

            await transaction.commit();

            return res.status(201).json({ 
                success: true, 
                message: 'Customer account registered successfully!',
                user: {
                    id: newUserId,
                    user_ID: newUserId,
                    customer_ID: newCustomerId,
                    username,
                    role: 'Customer',
                    accountType: 'Customer'
                }
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (err) {
        console.error('[Cool Fix] Registration error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 2. UNIFIED MULTI-ROLE LOGIN (Customer, Admin, Technician)
exports.login = async (req, res) => {
  try {
    const reqUsername = req.body.username || req.body.email || '';
    const reqPassword = req.body.password || '';
    const requestedRole = req.body.role || req.body.accountType || '';

    const username = String(reqUsername).trim();
    const password = String(reqPassword).trim();

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required.' 
      });
    }

    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ success: false, message: 'Database connection failed' });
    }

    // 1. Fetch account record from topUser
    const userQuery = `
      SELECT 
        user_ID,
        username,
        salt,
        hash,
        accountType,
        ISNULL(isDeleted, 0) AS isDeleted
      FROM [user3].[topUser]
      WHERE LOWER(username) = LOWER(@username) AND (isDeleted IS NULL OR isDeleted = 0)
    `;

    const result = await pool.request()
      .input('username', sql.VarChar(100), username)
      .query(userQuery);

    const user = result.recordset[0];

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid username or password.' });
    }

    // 2. Optional role tab check (if tab selected in UI)
    if (requestedRole) {
      const userRoleLower = user.accountType.toLowerCase();
      const reqRoleLower = requestedRole.toLowerCase();

      if (userRoleLower !== reqRoleLower) {
        return res.status(400).json({ 
          success: false, 
          message: `This account is a \({user.accountType}, but you selected\){requestedRole}.` 
        });
      }
    }

    // 3. Password Verification
    let isMatch = false;

    console.log('');
    console.log('=== LOGIN DEBUG ===');
    console.log('Username:', username);
    console.log('Input password:', password);
    console.log('DB hash value:', user.hash);
    console.log('DB salt value:', user.salt);
    console.log('Is hash bcrypt format?:', user.hash && user.hash.startsWith('$2'));
    console.log('==================');
    console.log('');

    if (user.hash) {
      try {
        isMatch = await bcrypt.compare(password, user.hash);
      } catch (e) {
        isMatch = false;
      }
    }

    // Fallback for legacy database records or dev seeds
    if (!isMatch && (user.hash === password || user.salt === password || user.username === password)) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid username or password.' });
    }

    // 4. Resolve Role-Specific Sub-IDs (customer_ID vs technician_ID)
    let technicianId = null;
    let customerId = null;
    const accountRole = user.accountType; // 'Customer', 'Technician', or 'Admin'

    if (accountRole.toLowerCase() === 'technician') {
      const techQuery = `
        SELECT technician_ID 
        FROM [user3].[technician] 
        WHERE user_ID = @userId
      `;
      const techResult = await pool.request()
        .input('userId', sql.Int, user.user_ID)
        .query(techQuery);
      
      technicianId = techResult.recordset[0]?.technician_ID || user.user_ID;
    } else if (accountRole.toLowerCase() === 'customer') {
      const custQuery = `
        SELECT customer_ID 
        FROM [user3].[newCustomer] 
        WHERE user_ID = @userId
      `;
      const custResult = await pool.request()
        .input('userId', sql.Int, user.user_ID)
        .query(custQuery);
      
      customerId = custResult.recordset[0]?.customer_ID || null;
    }

    // 5. Generate Response Body (Normalized for all frontend pages)
    const token = jwt.sign(
      { id: user.user_ID, username: user.username, role: accountRole },
      process.env.JWT_SECRET || 'coolfix-secret-key',
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      token: token,
      user: {
        id: user.user_ID,
        user_ID: user.user_ID,
        technician_ID: technicianId,
        customer_ID: customerId,
        username: user.username,
        role: accountRole,
        accountType: accountRole
      }
    });

  } catch (err) {
    console.error('[Cool Fix] Login Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ success: false, message: 'Username and new password required.' });
    }

    const pool = await poolPromise;

    const check = await pool.request()
      .input('username', sql.VarChar(100), username)
      .query(`SELECT user_ID FROM [user3].[topUser] WHERE LOWER(username) = LOWER(@username)`);

    if (check.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await pool.request()
      .input('username', sql.VarChar(100), username)
      .input('salt', sql.VarChar(255), salt)
      .input('hash', sql.VarChar(255), hash)
      .query(`UPDATE [user3].[topUser] SET salt = @salt, hash = @hash WHERE LOWER(username) = LOWER(@username)`);

    console.log(`[Cool Fix] Password reset for user: ${username}`);
    return res.status(200).json({ success: true, message: `Password reset for ${username}.` });
  } catch (err) {
    console.error('[Cool Fix] Reset Password Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};