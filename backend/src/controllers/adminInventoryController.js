/**
 * Cool Fix - Admin Inventory Controller
 * Supabase PostgreSQL Schema: "inventory"
 * Table: "inventoryItem"
 */

const pool = require('../config/supabaseDb');

// ==========================================
// 1. PARTS USED
// ==========================================

exports.partsUsed = async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM "new_jobBooking"."partsUsed"
    `;

    const result = await pool.query(query);

    console.log(
      `[Cool Fix] Fetched ${result.rows.length} parts used data from DB.`
    );

    return res.status(200).json({
      success: true,
      items: result.rows || []
    });

  } catch (err) {
    console.error('[Cool Fix] GET parts used Error:', err.message);

    res.status(500).json({
      success: false,
      message: err.message,
      items: []
    });
  }
};

// ==========================================
// 2. GET ALL INVENTORY
// ==========================================

/**
 * GET /api/admin/inventory
 * Fetches all non-deleted inventory items
 */
exports.getAllInventory = async (req, res) => {
  try {
    const query = `
      SELECT
        "itemID",
        COALESCE("itemType", 'Spare Parts') AS "itemType",
        COALESCE("itemName", 'Unnamed Item') AS "itemName",
        COALESCE("stock", 0) AS "stock",
        COALESCE("description", '') AS "description",
        COALESCE("SKU", 'SKU-NONE') AS "SKU",
        COALESCE("reorderAmount", 5) AS "reorderAmount",
        COALESCE("price", 0.0) AS "price",
        COALESCE("stockStatus", 'In Stock') AS "stockStatus"
      FROM "inventory"."inventoryItem"
      WHERE COALESCE("isDeleted", FALSE) = FALSE
      ORDER BY "itemID" DESC
    `;

    const result = await pool.query(query);

    console.log(
      `[Cool Fix] Fetched ${result.rows.length} inventory items from DB.`
    );

    return res.status(200).json({
      success: true,
      items: result.rows || []
    });

  } catch (err) {
    console.error('[Cool Fix] GET Inventory Error:', err.message);

    res.status(500).json({
      success: false,
      message: err.message,
      items: []
    });
  }
};

// ==========================================
// 3. CREATE INVENTORY ITEM
// ==========================================

/**
 * POST /api/admin/inventory
 * Creates a new inventory record
 */
exports.createItem = async (req, res) => {
  try {
    const {
      item,
      itemName,
      category,
      itemType,
      sku,
      SKU,
      stock,
      reorderAt,
      reorderAmount,
      price,
      description
    } = req.body;

    // Standardize input keys
    const finalName = item || itemName || 'New Spare Part';
    const finalType = category || itemType || 'Spare Parts';
    const finalSKU = sku || SKU || `SKU-${Date.now()}`;

    const currentStock = parseInt(stock, 10) || 0;
    const minReorder = parseInt(reorderAt || reorderAmount, 10) || 5;

    // Sanitize monetary input
    let cleanPrice = 0.0;

    if (typeof price === 'string') {
      cleanPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0.0;
    } else if (typeof price === 'number') {
      cleanPrice = price;
    }

    // Determine stock status
    let stockStatus = 'In Stock';

    if (currentStock === 0) {
      stockStatus = 'Out of Stock';
    } else if (currentStock <= minReorder) {
      stockStatus = 'Low Stock';
    }

    const insertQuery = `
      INSERT INTO "inventory"."inventoryItem"
      (
        "itemType",
        "itemName",
        "stock",
        "description",
        "isDeleted",
        "SKU",
        "reorderAmount",
        "price",
        "stockStatus"
      )
      VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7, $8)
      RETURNING "itemID"
    `;

    const result = await pool.query(insertQuery, [
      finalType,
      finalName,
      currentStock,
      description || 'Cool Fix Inventory Item',
      finalSKU,
      minReorder,
      cleanPrice,
      stockStatus
    ]);

    console.log(
      `[Cool Fix] Inventory item #${result.rows[0].itemID} created successfully in Supabase!`
    );

    res.status(201).json({
      success: true,
      message: 'Inventory item added successfully!',
      itemID: result.rows[0].itemID
    });

  } catch (err) {
    console.error('[Cool Fix] SQL POST Inventory Error:', err.message);

    res.status(500).json({
      success: false,
      message: `SQL Error: ${err.message}`
    });
  }
};

// ==========================================
// 4. UPDATE INVENTORY ITEM
// ==========================================

/**
 * PUT /api/admin/inventory/:itemId
 * Updates stock levels, prices, or reorder parameters
 */
exports.updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const {
      item,
      itemName,
      category,
      itemType,
      sku,
      SKU,
      stock,
      reorderAt,
      reorderAmount,
      price,
      description
    } = req.body;

    const finalName = item || itemName;
    const finalType = category || itemType;
    const finalSKU = sku || SKU;

    const currentStock = parseInt(stock, 10) || 0;
    const minReorder = parseInt(reorderAt || reorderAmount, 10) || 5;

    // Sanitize monetary input
    let cleanPrice = 0.0;

    if (typeof price === 'string') {
      cleanPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0.0;
    } else if (typeof price === 'number') {
      cleanPrice = price;
    }

    // Determine stock status
    let stockStatus = 'In Stock';

    if (currentStock === 0) {
      stockStatus = 'Out of Stock';
    } else if (currentStock <= minReorder) {
      stockStatus = 'Low Stock';
    }

    const updateQuery = `
      UPDATE "inventory"."inventoryItem"
      SET
        "itemName" = COALESCE($1, "itemName"),
        "itemType" = COALESCE($2, "itemType"),
        "stock" = $3,
        "price" = $4,
        "SKU" = COALESCE($5, "SKU"),
        "reorderAmount" = $6,
        "description" = COALESCE($7, "description"),
        "stockStatus" = $8
      WHERE "itemID" = $9
      RETURNING "itemID"
    `;

    const result = await pool.query(updateQuery, [
      finalName || null,
      finalType || null,
      currentStock,
      cleanPrice,
      finalSKU || null,
      minReorder,
      description || null,
      stockStatus,
      Number(itemId)
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found.'
      });
    }

    console.log(
      `[Cool Fix] Updated inventory item #${itemId} successfully!`
    );

    res.status(200).json({
      success: true,
      message: 'Item updated successfully!'
    });

  } catch (err) {
    console.error('[Cool Fix] SQL PUT Inventory Error:', err.message);

    res.status(500).json({
      success: false,
      message: `SQL Error: ${err.message}`
    });
  }
};