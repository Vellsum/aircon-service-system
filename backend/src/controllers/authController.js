const pool = require('../config/supabaseDb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// I AM THE NEW POSTGRE SQL VERSION

/**
 * GET /api/auth/customer-id/:userId
 * Retrieve the customer_ID associated with a user_ID.
 */
exports.getCustomerId = async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user_ID.'
            });
        }

        const result = await pool.query(`
            SELECT "customer_ID"
            FROM "user3"."newCustomer"
            WHERE "user_ID" = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer record not found for this user.'
            });
        }

        return res.status(200).json({
            success: true,
            customer_ID: result.rows[0].customer_ID
        });

    } catch (err) {
        console.error('[Cool Fix] Get Customer ID Error:', err);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve customer ID.'
        });
    }
};


// 1. REGISTER NEW CUSTOMER ONLY
exports.register = async (req, res) => {
    let client;

    try {
        const {
            username,
            password,
            customer_name,
            customer_address
        } = req.body;

        if (!username || !password || !customer_name) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields (username, password, full name).'
            });
        }

        // Check whether username already exists
        const existingUser = await pool.query(`
            SELECT "user_ID"
            FROM "user3"."topUser"
            WHERE LOWER("username") = LOWER($1)
        `, [username]);

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username is already taken. Please choose another.'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Start transaction
        client = await pool.connect();

        try {
            await client.query('BEGIN');

            // STEP 1: Insert parent table (topUser)
            const parentResult = await client.query(`
                INSERT INTO "user3"."topUser"
                    ("username", "salt", "hash", "accountType", "isDeleted")
                VALUES ($1, $2, $3, $4, $5)
                RETURNING "user_ID"
            `, [
                username,
                salt,
                hash,
                'Customer',
                false
            ]);

            const newUserId = parentResult.rows[0].user_ID;

            // STEP 2: Insert child table (newCustomer)
            const childResult = await client.query(`
                INSERT INTO "user3"."newCustomer"
                    (
                        "customer_name",
                        "customer_address",
                        "customer_aircons",
                        "loyaltyPoints",
                        "bought_packages",
                        "user_ID"
                    )
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING "customer_ID"
            `, [
                customer_name,
                customer_address || 'Singapore',
                1,
                0,
                0,
                newUserId
            ]);

            const newCustomerId = childResult.rows[0].customer_ID;

            // Commit transaction
            await client.query('COMMIT');

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
            await client.query('ROLLBACK');
            throw err;
        }

    } catch (err) {
        console.error('[Cool Fix] Registration error:', err);

        return res.status(500).json({
            success: false,
            message: 'Registration failed.'
        });

    } finally {
        if (client) {
            client.release();
        }
    }
};


// 2. UNIFIED MULTI-ROLE LOGIN
// Customer, Admin, Technician
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

        // STEP 1: Fetch account from topUser
        const userResult = await pool.query(`
            SELECT
                "user_ID",
                "username",
                "salt",
                "hash",
                "accountType",
                COALESCE("isDeleted", false) AS "isDeleted"
            FROM "user3"."topUser"
            WHERE LOWER("username") = LOWER($1)
              AND COALESCE("isDeleted", false) = false
        `, [username]);

        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        // STEP 2: Optional role tab check
        if (requestedRole) {
            const userRoleLower = String(user.accountType).toLowerCase();
            const reqRoleLower = String(requestedRole).toLowerCase();

            if (userRoleLower !== reqRoleLower) {
                return res.status(400).json({
                    success: false,
                    message: `This account is a ${user.accountType}, but you selected ${requestedRole}.\nPlease log in with the correct role.`
                });
            }
        }

        // STEP 3: Password verification
        let isMatch = false;

        if (user.hash) {
            try {
                isMatch = await bcrypt.compare(password, user.hash);
            } catch (err) {
                isMatch = false;
            }
        }

        // Temporary fallback for legacy plaintext database records.
        // Remove this once all accounts use bcrypt hashes.
        if (
            !isMatch &&
            (
                user.hash === password ||
                user.salt === password ||
                user.username === password
            )
        ) {
            isMatch = true;
        }

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        // STEP 4: Resolve role-specific IDs
        let technicianId = null;
        let customerId = null;

        const accountRole = user.accountType;

        if (String(accountRole).toLowerCase() === 'technician') {

            const techResult = await pool.query(`
                SELECT "technician_ID"
                FROM "user3"."technician"
                WHERE "user_ID" = $1
            `, [user.user_ID]);

            technicianId =
                techResult.rows[0]?.technician_ID || user.user_ID;

        } else if (String(accountRole).toLowerCase() === 'customer') {

            const custResult = await pool.query(`
                SELECT "customer_ID"
                FROM "user3"."newCustomer"
                WHERE "user_ID" = $1
            `, [user.user_ID]);

            customerId =
                custResult.rows[0]?.customer_ID || null;
        }

        // STEP 5: Generate JWT
        const token = jwt.sign(
            {
                id: user.user_ID,
                username: user.username,
                role: accountRole
            },
            process.env.JWT_SECRET || 'coolfix-secret-key',
            {
                expiresIn: '24h'
            }
        );

        // STEP 6: Return response
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
        console.error('[Cool Fix] Login Error:', err);

        return res.status(500).json({
            success: false,
            message: 'Login failed.'
        });
    }
};


// 3. RESET PASSWORD
// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
    try {
        const { username, newPassword } = req.body;

        if (!username || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Username and new password required.'
            });
        }

        // Check whether user exists
        const check = await pool.query(`
            SELECT "user_ID"
            FROM "user3"."topUser"
            WHERE LOWER("username") = LOWER($1)
        `, [username]);

        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Generate new password hash
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        // Update password
        await pool.query(`
            UPDATE "user3"."topUser"
            SET
                "salt" = $1,
                "hash" = $2
            WHERE LOWER("username") = LOWER($3)
        `, [
            salt,
            hash,
            username
        ]);

        console.log(`[Cool Fix] Password reset for user: ${username}`);

        return res.status(200).json({
            success: true,
            message: `Password reset for ${username}.`
        });

    } catch (err) {
        console.error('[Cool Fix] Reset Password Error:', err);

        return res.status(500).json({
            success: false,
            message: 'Password reset failed.'
        });
    }
};