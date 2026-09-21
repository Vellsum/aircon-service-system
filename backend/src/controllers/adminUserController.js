/**
 * Cool Fix - Admin User Controller
 * Manages [user3].[newCustomer] and [user3].[technician]
 */

const { poolPromise, sql } = require('../config/db');

// ==========================================
// CUSTOMERS MANAGEMENT ([user3].[newCustomer])
// ==========================================

/**
 * GET /api/admin/users/customers
 * Fetches all registered customers
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
        cccustomer_address,
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
 * Creates a new customer row
 */
exports.createCustomer = async (req, res) => {
  try {
    const { customer_name, cccustomer_address, loyaltyPoints } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    const query = `
      INSERT INTO [user3].[newCustomer] 
        (customer_name, customer_aircons, loyaltyPoints, cccustomer_address, bought_packages, totalBookings, totalSpent)
      VALUES 
        (@name, '1', ISNULL(@points, 0), ISNULL(@address, 'Singapore'), 0, 0, 0.0)
    `;

    await pool.request()
      .input('name', sql.VarChar(100), customer_name || 'New Customer')
      .input('points', sql.Int, parseInt(loyaltyPoints, 10) || 0)
      .input('address', sql.VarChar(100), cccustomer_address || 'Singapore')
      .query(query);

    res.status(201).json({ success: true, message: 'Customer added successfully!' });
  } catch (err) {
    console.error('[Cool Fix] POST Customer Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// TECHNICIANS MANAGEMENT ([user3].[technician])
// ==========================================

/**
 * GET /api/admin/users/technicians
 * Fetches all field service technicians
 */
exports.getAllTechnicians = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, technicians: [] });

    const query = `
      SELECT 
        technician_ID,
        technician_name,
        technician_rating,
        user_ID,
        specialty,
        jobsDone
      FROM [user3].[technician]
      ORDER BY technician_ID DESC
    `;

    const result = await pool.request().query(query);
    res.status(200).json({ success: true, technicians: result.recordset || [] });
  } catch (err) {
    console.error('[Cool Fix] GET Technicians Error:', err.message);
    res.status(500).json({ success: false, message: err.message, technicians: [] });
  }
};

/**
 * POST /api/admin/users/technicians
 * Creates a new technician row
 */
exports.createTechnician = async (req, res) => {
  try {
    const { technician_name, specialty } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    const query = `
      INSERT INTO [user3].[technician] 
        (technician_name, technician_rating, specialty, jobsDone)
      VALUES 
        (@name, '5.0', ISNULL(@specialty, 'General Servicing'), 0)
    `;

    await pool.request()
      .input('name', sql.VarChar(100), technician_name || 'New Technician')
      .input('specialty', sql.VarChar(100), specialty || 'Aircon Servicing')
      .query(query);

    res.status(201).json({ success: true, message: 'Technician added successfully!' });
  } catch (err) {
    console.error('[Cool Fix] POST Technician Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};