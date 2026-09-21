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
            .query(`SELECT user_ID FROM [user3].[topUser] WHERE username = @username`);

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
                .input('salt', sql.VarChar(100), salt)
                .input('hash', sql.VarChar(100), hash)
                .input('accountType', sql.VarChar(100), 'Customer') // Enforced
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
                .input('customer_address', sql.VarChar(100), customer_address || '')
                .input('customer_aircons', sql.Int, 0)
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

            res.status(201).json({ 
                success: true, 
                message: 'Customer account registered successfully!',
                user: {
                    user_ID: newUserId,
                    customer_ID: newCustomerId,
                    username,
                    role: 'customer'
                }
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. USER LOGIN WITH ROLE NORMALIZATION & VALIDATION
exports.login = async (req, res) => {
    try {
        const { username, password, role: requestedRole } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required.' 
            });
        }

        const pool = await poolPromise;

        const userResult = await pool.request()
            .input('username', sql.VarChar(100), username)
            .query(`SELECT * FROM [user3].[topUser] WHERE username = @username AND isDeleted = 0`);

        const user = userResult.recordset[0];

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid username or password.' 
            });
        }

        const isMatch = await bcrypt.compare(password, user.hash);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid username or password.' 
            });
        }

        // Normalize DB accountType ("Technician" -> "technician")
        const normalizedRole = user.accountType ? user.accountType.toLowerCase() : '';

        // Validate requested role matches DB accountType safely
        if (requestedRole && requestedRole.toLowerCase() !== normalizedRole) {
            return res.status(403).json({
                success: false,
                message: `Unauthorized. Account is registered as ${user.accountType}, not ${requestedRole}.`
            });
        }

        const token = jwt.sign(
            { user_ID: user.user_ID, accountType: user.accountType, role: normalizedRole },
            process.env.JWT_SECRET || 'aircon_care_secret_jwt_key_2026',
            { expiresIn: '8h' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                user_ID: user.user_ID,
                username: user.username,
                role: normalizedRole, // Required for React Router & AuthContext
                accountType: user.accountType
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};