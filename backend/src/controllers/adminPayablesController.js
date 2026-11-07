/**
 * Cool Fix - Admin Payables & Services Controller
 * Supabase PostgreSQL schema: "payables"
 */

const pool = require('../config/supabaseDb');

// ==========================================
// 1. SERVICES MANAGEMENT
// ==========================================

/**
 * GET /api/admin/payables/services
 */
exports.getAllServices = async (req, res) => {
  try {
    if (!pool) {
      return res.status(200).json({ success: true, services: [] });
    }

    const query = `
      SELECT
        service_ID,
        service_name,
        description,
        price
      FROM "payables".service
      ORDER BY service_ID DESC
    `;

    const result = await pool.query(query);

    res.status(200).json({
      success: true,
      services: result.rows || []
    });
  } catch (err) {
    console.error('[Cool Fix] GET Services Error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message,
      services: []
    });
  }
};

/**
 * POST /api/admin/payables/services
 */
exports.createService = async (req, res) => {
  try {
    const { service_name, description, price } = req.body;

    if (!pool) {
      return res.status(500).json({
        success: false,
        message: 'Database offline'
      });
    }

    let cleanPrice = 0.0;

    if (typeof price === 'string') {
      cleanPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0.0;
    } else if (typeof price === 'number') {
      cleanPrice = price;
    }

    const query = `
      INSERT INTO "payables".service
        (service_name, description, price)
      VALUES
        ($1, $2, $3)
    `;

    await pool.query(query, [
      service_name || 'Standard Servicing',
      description || 'Aircon servicing & maintenance',
      cleanPrice
    ]);

    res.status(201).json({
      success: true,
      message: 'Service created successfully!'
    });
  } catch (err) {
    console.error('[Cool Fix] POST Service Error:', err.message);
    res.status(500).json({
      success: false,
      message: `SQL Error: ${err.message}`
    });
  }
};

/**
 * PUT /api/admin/payables/services/:id
 */
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, description, price } = req.body;

    if (!pool) {
      return res.status(500).json({
        success: false,
        message: 'Database offline'
      });
    }

    let cleanPrice = price;

    if (typeof price === 'string') {
      cleanPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0.0;
    }

    const query = `
      UPDATE "payables".service
      SET
        service_name = COALESCE($1, service_name),
        description = COALESCE($2, description),
        price = COALESCE($3, price)
      WHERE service_ID = $4
    `;

    await pool.query(query, [
      service_name ?? null,
      description ?? null,
      cleanPrice ?? null,
      id
    ]);

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully!'
    });
  } catch (err) {
    console.error('[Cool Fix] PUT Service Error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * DELETE /api/admin/payables/services/:id
 */
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    if (!pool) {
      return res.status(500).json({
        success: false,
        message: 'Database offline'
      });
    }

    await pool.query(
      `DELETE FROM "payables".service WHERE service_ID = $1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Service removed successfully!'
    });
  } catch (err) {
    console.error('[Cool Fix] DELETE Service Error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
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
    if (!pool) {
      return res.status(200).json({
        success: true,
        packages: []
      });
    }

    const query = `
      SELECT
        package_ID,
        package_name,
        description,
        price,
        service_count
      FROM "payables".package
      ORDER BY package_ID DESC
    `;

    const result = await pool.query(query);

    res.status(200).json({
      success: true,
      packages: result.rows || []
    });
  } catch (err) {
    console.error('[Cool Fix] GET Packages Error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message,
      packages: []
    });
  }
};

/**
 * POST /api/admin/payables/packages
 */
exports.createPackage = async (req, res) => {
  try {
    const {
      package_name,
      description,
      price,
      service_count
    } = req.body;

    if (!pool) {
      return res.status(500).json({
        success: false,
        message: 'Database offline'
      });
    }

    let cleanPrice = 0.0;

    if (typeof price === 'string') {
      cleanPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0.0;
    } else if (typeof price === 'number') {
      cleanPrice = price;
    }

    const query = `
      INSERT INTO "payables".package
        (package_name, description, price, service_count)
      VALUES
        ($1, $2, $3, $4)
    `;

    await pool.query(query, [
      package_name || 'New Package',
      description || 'Aircon service package',
      cleanPrice,
      parseInt(service_count, 10) || 3
    ]);

    res.status(201).json({
      success: true,
      message: 'Package created successfully!'
    });
  } catch (err) {
    console.error('[Cool Fix] POST Package Error:', err.message);
    res.status(500).json({
      success: false,
      message: `SQL Error: ${err.message}`
    });
  }
};