/**
 * Cool Fix - Admin Payables & Services Controller
 * Schema focus: [payables] / Catalog
 */

const { poolPromise, sql } = require('../config/db');

// ==========================================
// 1. SERVICES MANAGEMENT
// ==========================================

/**
 * GET /api/admin/payables/services
 * Fetches all available aircon services
 */
exports.getAllServices = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, services: [] });

    // Query active service catalog
    const query = `
      SELECT 
        service_ID,
        service_name,
        description,
        price,
        duration_minutes,
        category
      FROM [payables].[service]
      ORDER BY service_ID DESC
    `;

    const result = await pool.request().query(query);
    res.status(200).json({ success: true, services: result.recordset || [] });
  } catch (err) {
    console.error('[Cool Fix] GET Services Error:', err.message);
    res.status(500).json({ success: false, message: err.message, services: [] });
  }
};

/**
 * POST /api/admin/payables/services
 * Creates a new aircon service entry
 */
exports.createService = async (req, res) => {
  try {
    const { service_name, description, price, duration_minutes, category } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    // Clean price string if user typed "$"
    let cleanPrice = 0.0;
    if (typeof price === 'string') {
      cleanPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0.0;
    } else if (typeof price === 'number') {
      cleanPrice = price;
    }

    const query = `
      INSERT INTO [payables].[service] 
        (service_name, description, price, duration_minutes, category)
      VALUES 
        (@name, @desc, @price, @duration, @category)
    `;

    await pool.request()
      .input('name', sql.VarChar(100), service_name || 'Standard Servicing')
      .input('desc', sql.VarChar(255), description || 'Aircon servicing & maintenance')
      .input('price', sql.Float, cleanPrice)
      .input('duration', sql.Int, parseInt(duration_minutes, 10) || 60)
      .input('category', sql.VarChar(50), category || 'General')
      .query(query);

    res.status(201).json({ success: true, message: 'Service created successfully!' });
  } catch (err) {
    console.error('[Cool Fix] POST Service Error:', err.message);
    res.status(500).json({ success: false, message: `SQL Error: ${err.message}` });
  }
};

// ==========================================
// 2. PACKAGES MANAGEMENT
// ==========================================

/**
 * GET /api/admin/payables/packages
 * Fetches service bundles/packages
 */
exports.getAllPackages = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, packages: [] });

    const query = `
      SELECT 
        package_ID,
        package_name,
        description,
        price,
        service_count
      FROM [payables].[package]
      ORDER BY package_ID DESC
    `;

    const result = await pool.request().query(query);
    res.status(200).json({ success: true, packages: result.recordset || [] });
  } catch (err) {
    console.error('[Cool Fix] GET Packages Error:', err.message);
    res.status(500).json({ success: false, message: err.message, packages: [] });
  }
};

/**
 * POST /api/admin/payables/packages
 * Creates a new service package bundle
 */
exports.createPackage = async (req, res) => {
  try {
    const { package_name, description, price, service_count } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    let cleanPrice = 0.0;
    if (typeof price === 'string') {
      cleanPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0.0;
    } else if (typeof price === 'number') {
      cleanPrice = price;
    }

    const query = `
      INSERT INTO [payables].[package] 
        (package_name, description, price, service_count)
      VALUES 
        (@name, @desc, @price, @count)
    `;

    await pool.request()
      .input('name', sql.VarChar(100), package_name || 'New Package')
      .input('desc', sql.VarChar(255), description || 'Aircon service package')
      .input('price', sql.Float, cleanPrice)
      .input('count', sql.Int, parseInt(service_count, 10) || 3)
      .query(query);

    res.status(201).json({ success: true, message: 'Package created successfully!' });
  } catch (err) {
    console.error('[Cool Fix] POST Package Error:', err.message);
    res.status(500).json({ success: false, message: `SQL Error: ${err.message}` });
  }
};