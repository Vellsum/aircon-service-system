const { sql, poolPromise } = require('../config/db');

// 1. GET /api/admin/bookings - Fetch all bookings with customer & technician details
const getAllBookings = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                b.booking_ID,
                b.date,
                b.time,
                b.location,
                b.status AS bookingStatus,
                b.isFollowup,
                c.customer_ID,
                c.customer_name,
                t.technician_ID,
                t.technician_name
            FROM new_jobBooking.Booking b
            JOIN user3.newCustomer c ON b.customer_ID = c.customer_ID
            JOIN user3.technician t ON b.technician_ID = t.technician_ID
            ORDER BY b.booking_ID DESC
        `);

        // Return the results as JSON
        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ success: false, message: 'Database query failed', error: error.message });
    }
};

// 2. PUT /api/admin/bookings/:bookingId/status - Update booking status
const updateBookingStatus = async (req, res) => {
    const { bookingId } = req.params;
    const { status } = req.body; // e.g., 'Pending', 'Assigned', 'Completed', 'Cancelled'
    
    // Validate the status input
    if (!status) {
        return res.status(400).json({ success: false, message: 'Status string is required.' });
    }

    // Validate that the status is one of the allowed values
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('booking_ID', sql.Int, bookingId)
            .input('status', sql.VarChar(100), status)
            .query(`
                UPDATE new_jobBooking.Booking
                SET status = @status
                WHERE booking_ID = @booking_ID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        // Return a success response
        res.status(200).json({
            success: true,
            message: `Booking ID ${bookingId} status updated to '${status}'.`
        });
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ success: false, message: 'Failed to update booking status.', error: error.message });
    }
};

// 3. PUT /api/admin/bookings/:bookingId/reassign - Reassign technician to a booking
const reassignTechnician = async (req, res) => {
    const { bookingId } = req.params;
    const { technician_ID } = req.body;

    if (!technician_ID) {
        return res.status(400).json({ success: false, message: 'technician_ID is required.' });
    }

    // Validate that the technician_ID is a number
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('booking_ID', sql.Int, bookingId)
            .input('technician_ID', sql.Int, technician_ID)
            .query(`
                UPDATE new_jobBooking.Booking
                SET technician_ID = @technician_ID
                WHERE booking_ID = @booking_ID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        res.status(200).json({
            success: true,
            message: `Booking ID ${bookingId} reassigned to Technician ID ${technician_ID}.`
        });
    } catch (error) {
        console.error('Error reassigning technician:', error);
        res.status(500).json({ success: false, message: 'Failed to reassign technician.', error: error.message });
    }
};

module.exports = {
    getAllBookings,
    updateBookingStatus,
    reassignTechnician
};