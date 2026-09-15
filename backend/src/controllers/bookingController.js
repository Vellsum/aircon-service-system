// backend/src/controllers/bookingController.js
const { poolPromise, sql } = require('../config/db');

// 1. GET ALL SERVICES & PRICING
exports.getServices = async (req, res) => {
    try {
        const pool = await poolPromise;
        
        // Removed strict isdeleted filter so all active services return cleanly
        const result = await pool.request()
            .query(`
                SELECT service_id, service_name, description, price 
                FROM [payables].[service]
                WHERE isdeleted IS NULL OR isdeleted = 'false' OR isdeleted = '0'
            `);

        res.status(200).json({
            success: true,
            services: result.recordset
        });
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. CREATE NEW BOOKING
exports.createBooking = async (req, res) => {
    try {
        const { customer_ID, date, time, location } = req.body;

        if (!customer_ID || !date || !time || !location) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide customer_ID, date, time, and location.' 
            });
        }

        const pool = await poolPromise;

        // technician_ID is set to NULL until assigned by Admin
        const result = await pool.request()
            .input('customer_ID', sql.Int, customer_ID)
            .input('technician_ID', sql.Int, null) 
            .input('date', sql.Date, date)
            .input('time', sql.VarChar(50), time)
            .input('isFollowup', sql.Bit, 0)
            .input('location', sql.VarChar(100), location)
            .input('status', sql.VarChar(100), 'Pending')
            .query(`
                INSERT INTO [new_jobBooking].[Booking] (customer_ID, technician_ID, date, time, isFollowup, location, status)
                OUTPUT INSERTED.booking_ID
                VALUES (@customer_ID, @technician_ID, @date, @time, @isFollowup, @location, @status)
            `);

        const newBookingId = result.recordset[0].booking_ID;

        res.status(201).json({
            success: true,
            message: 'Booking created successfully!',
            booking_ID: newBookingId
        });

    } catch (err) {
        console.error('Error creating booking:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};