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
 */
exports.getAllServices = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, services: [] });

    const query = `
      SELECT 
        service_ID,
        service_name,
        description,
        price
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
 */
exports.createService = async (req, res) => {
  try {
    const { service_name, description, price } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    let cleanPrice = 0.0;
    if (typeof price === 'string') {
      cleanPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0.0;
    } else if (typeof price === 'number') {
      cleanPrice = price;
    }

    const query = `
      INSERT INTO [payables].[service] 
        (service_name, description, price)
      VALUES 
        (@name, @desc, @price)
    `;

    await pool.request()
      .input('name', sql.VarChar(100), service_name || 'Standard Servicing')
      .input('desc', sql.VarChar(255), description || 'Aircon servicing & maintenance')
      .input('price', sql.Float, cleanPrice)
      .query(query);

    res.status(201).json({ success: true, message: 'Service created successfully!' });
  } catch (err) {
    console.error('[Cool Fix] POST Service Error:', err.message);
    res.status(500).json({ success: false, message: `SQL Error: ${err.message}` });
  }
};

/**
 * PUT /api/admin/payables/services/:id
 */
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, description, price } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    let cleanPrice = price;
    if (typeof price === 'string') {
      cleanPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0.0;
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.VarChar(100), service_name)
      .input('desc', sql.VarChar(255), description)
      .input('price', sql.Float, cleanPrice)
      .query(`
        UPDATE [payables].[service]
        SET service_name = ISNULL(@name, service_name),
            description = ISNULL(@desc, description),
            price = ISNULL(@price, price)
        WHERE service_ID = @id
      `);

    return res.status(200).json({ success: true, message: 'Service updated successfully!' });
  } catch (err) {
    console.error('[Cool Fix] PUT Service Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/admin/payables/services/:id
 */
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });

    await pool.request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM [payables].[service] WHERE service_ID = @id`);

    return res.status(200).json({ success: true, message: 'Service removed successfully!' });
  } catch (err) {
    console.error('[Cool Fix] DELETE Service Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 2. PACKAGES MANAGEMENT
// ==========================================

/**
 * GET /api/admin/payables/packages
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