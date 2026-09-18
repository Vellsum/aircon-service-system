const { getPool } = require('../config/db'); // Your database connection pool

// 1. Get assigned jobs for a specific technician
exports.getAssignedJobs = async (req, res) => {
  const { technicianId } = req.params;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('technicianId', technicianId)
      .query(`
        SELECT 
          b.booking_ID AS id,
          c.name AS customerName,
          c.address AS location,
          b.service_type AS serviceType,
          b.booking_status AS status,
          b.scheduled_date AS date,
          b.scheduled_time AS time
        FROM Bookings b
        JOIN Customers c ON b.customer_ID = c.customer_ID
        WHERE b.technician_ID = @technicianId
      `);

    res.status(200).json({ success: true, data: result.recordset });
  } catch (err) {
    console.warn('Database connection failed, returning fallback technician jobs:', err.message);

    // Fallback data for testing UI before DB is fully seeded
    res.status(200).json({
      success: true,
      data: [
        { id: 101, customerName: 'John Doe', location: '123 Pasir Ris Grove', serviceType: 'Aircon Chemical Wash', status: 'Assigned', date: '2026-03-25', time: '10:00 AM' },
        { id: 102, customerName: 'Jane Smith', location: '456 Orchard Road', serviceType: 'General Servicing', status: 'In Progress', date: '2026-03-25', time: '02:00 PM' }
      ]
    });
  }
};

// 2. Submit service report or update job status
exports.updateJobStatus = async (req, res) => {
  const { jobId } = req.params;
  const { status, remarks, partsUsed } = req.body;

  try {
    const pool = await getPool();
    await pool.request()
      .input('jobId', jobId)
      .input('status', status)
      .input('remarks', remarks || '')
      .query(`
        UPDATE Bookings 
        SET booking_status = @status, service_remarks = @remarks 
        WHERE booking_ID = @jobId
      `);

    res.status(200).json({ success: true, message: 'Job status updated successfully' });
  } catch (err) {
    console.error('Error updating job status:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update job status' });
  }
};