/**
 * Cool Fix - Admin Booking Controller
 * Database Schema: [new_jobBooking].[Booking]
 * Key Relationships:
 *  - customer_ID -> [user3].[newCustomer].[customer_ID] (INT, NOT NULL)
 *  - technician_ID -> [user3].[technician].[technician_ID] (INT, NULLABLE)
 *  - date -> SQL DATE (Requires YYYY-MM-DD format)
 */

const { poolPromise, sql } = require('../config/db');

/**
 * Safe converter for JS Date objects to YYYY-MM-DD string format
 * Required because Azure SQL 'date' fields require strict ISO date formatting.
 */
const parseToSqlDate = (dateStr) => {
  if (!dateStr) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * GET /api/admin/bookings
 * Fetches all bookings joined with customer and technician names for display
 */
exports.getAllBookings = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, bookings: [] });

    // Join Booking table with newCustomer and technician tables to fetch display names
    const query = `
      SELECT 
        b.booking_ID,
        b.customer_ID,
        b.technician_ID,
        CONVERT(VARCHAR(10), b.[date], 120) AS booking_date,
        b.time,
        b.location,
        b.status,
        b.comments,
        ISNULL(c.customer_name, 'Guest Customer') AS customer_name,
        ISNULL(tech.technician_name, 'Unassigned') AS technician_name
      FROM [new_jobBooking].[Booking] b
      LEFT JOIN [user3].[newCustomer] c ON b.customer_ID = c.customer_ID
      LEFT JOIN [user3].[technician] tech ON b.technician_ID = tech.technician_ID
      ORDER BY b.booking_ID DESC
    `;

    const result = await pool.request().query(query);
    return res.status(200).json({ success: true, bookings: result.recordset || [] });
  } catch (err) {
    console.error('[Cool Fix] GET Bookings Error:', err.message);
    res.status(500).json({ success: false, message: err.message, bookings: [] });
  }
};

/**
 * GET /api/admin/users/technicians
 * Fetches active technicians from [user3].[technician] so technician_ID matches FK constraints
 */
exports.getTechnicians = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, technicians: [] });

    const query = `
      SELECT technician_ID, technician_name 
      FROM [user3].[technician]
    `;

    const result = await pool.request().query(query);
    res.status(200).json({ success: true, technicians: result.recordset || [] });
  } catch (err) {
    console.error('[Cool Fix] Fetch Technicians Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/bookings
 * Creates a new booking row. 
 * Requires customer_ID (numeric INT), date, time, location, status, and optional technician_ID
 */
// POST /api/admin/bookings - Create new Cool Fix booking with dynamic Customer handling
exports.createBooking = async (req, res) => {
  try {
    const { customer_ID, customer_name, technician_ID, booking_date, time, location, isFollowup, status, comments } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database connection offline' });

    let finalCustomerId = parseInt(customer_ID, 10);

    // If no numeric ID provided or the ID is invalid, check if we should create a new Customer row first
    if (isNaN(finalCustomerId) || finalCustomerId <= 0) {
      const nameToInsert = customer_name && customer_name.trim() !== "" ? customer_name.trim() : "New Customer";

      // Insert new customer into [user3].[newCustomer] and grab the newly generated customer_ID
      const newCustResult = await pool.request()
        .input('custName', sql.VarChar(100), nameToInsert)
        .query(`
          INSERT INTO [user3].[newCustomer] (customer_name)
          OUTPUT INSERTED.customer_ID
          VALUES (@custName)
        `);

      if (newCustResult.recordset && newCustResult.recordset.length > 0) {
        finalCustomerId = newCustResult.recordset[0].customer_ID;
      } else {
        // Ultimate fallback to existing customer if table insert is restricted
        const custCheck = await pool.request().query(`SELECT TOP 1 customer_ID FROM [user3].[newCustomer]`);
        finalCustomerId = custCheck.recordset.length > 0 ? custCheck.recordset[0].customer_ID : 1;
      }
    } else {
      // Verify if the manually entered numeric ID exists in [user3].[newCustomer]
      const checkExisting = await pool.request().query(`
        SELECT customer_ID FROM [user3].[newCustomer] WHERE customer_ID = ${finalCustomerId}
      `);
      
      // If it doesn't exist, create it with a placeholder name so FK constraint passes
      if (checkExisting.recordset.length === 0) {
        await pool.request()
          .input('cId', sql.Int, finalCustomerId)
          .input('cName', sql.VarChar(100), customer_name || `Customer #${finalCustomerId}`)
          .query(`
            SET IDENTITY_INSERT [user3].[newCustomer] ON;
            INSERT INTO [user3].[newCustomer] (customer_ID, customer_name) VALUES (@cId, @cName);
            SET IDENTITY_INSERT [user3].[newCustomer] OFF;
          `);
      }
    }

    // Resolve Technician ID safely
    let validTechId = parseInt(technician_ID, 10);
    if (!isNaN(validTechId) && validTechId > 0) {
      const techCheck = await pool.request().query(`
        SELECT technician_ID FROM [user3].[technician] WHERE technician_ID = ${validTechId}
      `);
      if (techCheck.recordset.length === 0) validTechId = null;
    } else {
      validTechId = null;
    }

    const formattedDate = parseToSqlDate(booking_date);

    // Insert into [new_jobBooking].[Booking]
    const insertQuery = `
      INSERT INTO [new_jobBooking].[Booking] 
        (customer_ID, technician_ID, [date], [time], isFollowup, location, status, comments)
      VALUES 
        (@custId, @techId, @dateVal, @timeVal, @followupVal, @locationVal, ISNULL(@statusVal, 'Pending'), @commentsVal)
    `;

    await pool.request()
      .input('custId', sql.Int, finalCustomerId)
      .input('techId', sql.Int, validTechId)
      .input('dateVal', sql.Date, formattedDate)
      .input('timeVal', sql.VarChar(50), time || '09:00:00')
      .input('followupVal', sql.Bit, isFollowup ? 1 : 0)
      .input('locationVal', sql.VarChar(100), location || 'Singapore Main Branch')
      .input('statusVal', sql.VarChar(100), status || 'Pending')
      .input('commentsVal', sql.VarChar(500), comments || 'Service booking')
      .query(insertQuery);

    res.status(201).json({ success: true, message: 'Cool Fix booking created successfully!' });
  } catch (err) {
    console.error('[Cool Fix] SQL POST Error:', err.message);
    res.status(500).json({ success: false, message: `SQL Error: ${err.message}` });
  }
};

/**
 * PUT /api/admin/bookings/:bookingId/status
 * Updates status, date, and technician assignment for an existing booking row
 */
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, technician_ID, booking_date } = req.body;

    if (!bookingId || bookingId === 'undefined') {
      return res.status(400).json({ success: false, message: 'Invalid or missing Booking ID.' });
    }

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database connection offline' });

    const formattedDate = parseToSqlDate(booking_date);

    // Validate technician_ID against [user3].[technician]
    let validTechId = parseInt(technician_ID, 10);
    if (isNaN(validTechId) || validTechId <= 0) {
      validTechId = null;
    }

    const updateQuery = `
      UPDATE [new_jobBooking].[Booking]
      SET status = ISNULL(@statusVal, status),
          technician_ID = CASE WHEN @techIdProvided = 1 THEN @techId ELSE technician_ID END,
          [date] = CASE WHEN @dateVal IS NOT NULL THEN @dateVal ELSE [date] END
      WHERE booking_ID = @bookingId
    `;

    await pool.request()
      .input('bookingId', sql.Int, Number(bookingId))
      .input('statusVal', sql.VarChar(100), status || null)
      .input('techIdProvided', sql.Bit, technician_ID !== undefined ? 1 : 0)
      .input('techId', sql.Int, validTechId)
      .input('dateVal', sql.Date, formattedDate)
      .query(updateQuery);

    console.log(`[Cool Fix] Updated booking #${bookingId} successfully!`);
    res.status(200).json({ success: true, message: 'Cool Fix booking updated successfully!' });
  } catch (err) {
    console.error('[Cool Fix] SQL PUT Error:', err.message);
    res.status(500).json({ success: false, message: `SQL Error: ${err.message}` });
  }
};