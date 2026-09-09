const { sql, poolPromise } = require('../config/db');

// 1. GET /api/admin/users - Fetch all users with their role details
const getAllUsers = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                u.user_ID,
                u.username,
                u.accountType,
                u.isDeleted,
                c.customer_ID,
                c.customer_name,
                c.customer_address,
                c.customer_aircons,
                c.loyaltyPoints,
                t.technician_ID,
                t.technician_name,
                t.technician_rating,
                a.admin_id,
                a.admin_name,
                a.authorityKey
            FROM user3.topUser u
            LEFT JOIN user3.newCustomer c ON u.user_ID = c.user_ID
            LEFT JOIN user3.technician t ON u.user_ID = t.user_ID
            LEFT JOIN user3.admin a ON u.user_ID = a.user_ID
            WHERE u.isDeleted = 0
            ORDER BY u.user_ID DESC
        `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Database query failed', error: error.message });
    }
};

// 2. POST /api/admin/users/technician - Create a new Technician account
const createTechnician = async (req, res) => {
    const { username, password, technician_name } = req.body;

    if (!username || !password || !technician_name) {
        return res.status(400).json({ success: false, message: 'Username, password, and technician name are required.' });
    }

    try {
        const pool = await poolPromise;
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            // Insert into parent table user3.topUser
            const userResult = await transaction.request()
                .input('username', sql.VarChar(100), username)
                .input('salt', sql.VarChar(100), 'default_salt')
                .input('hash', sql.VarChar(100), password) // In production, hash with bcrypt
                .input('accountType', sql.VarChar(100), 'Technician')
                .query(`
                    INSERT INTO user3.topUser (username, salt, hash, accountType, isDeleted)
                    VALUES (@username, @salt, @hash, @accountType, 0);
                    SELECT SCOPE_IDENTITY() AS user_ID;
                `);

            const newUserID = userResult.recordset[0].user_ID;

            // Insert into child table user3.technician
            await transaction.request()
                .input('technician_name', sql.VarChar(100), technician_name)
                .input('technician_rating', sql.Int, 5) // Initial rating default
                .input('user_ID', sql.Int, newUserID)
                .query(`
                    INSERT INTO user3.technician (technician_name, technician_rating, user_ID)
                    VALUES (@technician_name, @technician_rating, @user_ID);
                `);

            await transaction.commit();

            res.status(201).json({
                success: true,
                message: 'Technician account created successfully.',
                user_ID: newUserID
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        console.error('Error creating technician:', error);
        res.status(500).json({ success: false, message: 'Failed to create technician account.', error: error.message });
    }
};

// 3. DELETE /api/admin/users/:userId - Soft delete user account
const softDeleteUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_ID', sql.Int, userId)
            .query(`
                UPDATE user3.topUser
                SET isDeleted = 1
                WHERE user_ID = @user_ID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({
            success: true,
            message: `User ID ${userId} has been soft-deleted successfully.`
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user.', error: error.message });
    }
};

module.exports = {
    getAllUsers,
    createTechnician,
    softDeleteUser
};