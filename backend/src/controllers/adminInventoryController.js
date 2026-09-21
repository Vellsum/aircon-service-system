/**
 * Cool Fix - Admin Inventory Controller
 * Table Schema: [inventory].[inventoryItem]
 * Columns: itemID (PK), itemType, itemName, stock, description, isDeleted, SKU, reorderAmount, price, stockStatus
 */

const { poolPromise, sql } = require('../config/db');

/**
 * GET /api/admin/inventory
 * Fetches all non-deleted inventory items from Azure SQL
 */
exports.getAllInventory = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(200).json({ success: true, items: [] });

    // Select all valid inventory items
    const query = `
      SELECT 
        itemID,
        ISNULL(itemType, 'Spare Parts') AS itemType,
        ISNULL(itemName, 'Unnamed Item') AS itemName,
        ISNULL(stock, 0) AS stock,
        ISNULL(description, '') AS description,
        ISNULL(SKU, 'SKU-NONE') AS SKU,
        ISNULL(reorderAmount, 5) AS reorderAmount,
        ISNULL(price, 0.0) AS price,
        ISNULL(stockStatus, 'In Stock') AS stockStatus
      FROM [inventory].[inventoryItem]
      WHERE ISNULL(isDeleted, 0) = 0
      ORDER BY itemID DESC
    `;

    const result = await pool.request().query(query);
    console.log(`[Cool Fix] Fetched ${result.recordset.length} inventory items from DB.`);
    return res.status(200).json({ success: true, items: result.recordset || [] });
  } catch (err) {
    console.error('[Cool Fix] GET Inventory Error:', err.message);
    res.status(500).json({ success: false, message: err.message, items: [] });
  }
};

/**
 * POST /api/admin/inventory
 * Creates a new inventory record satisfying all NOT NULL column constraints
 */
exports.createItem = async (req, res) => {
  try {
    const { item, itemName, category, itemType, sku, SKU, stock, reorderAt, reorderAmount, price, description } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database connection offline' });

    // Standardize input keys to handle variations from different form fields
    const finalName = item || itemName || "New Spare Part";
    const finalType = category || itemType || "Spare Parts";
    const finalSKU = sku || SKU || `SKU-${Date.now()}`;
    const currentStock = parseInt(stock, 10) || 0;
    const minReorder = parseInt(reorderAt || reorderAmount, 10) || 5;

    // Sanitize monetary string input if typed with a '$' symbol
    let cleanPrice = 0.0;
    if (typeof price === "string") {
      cleanPrice = parseFloat(price.replace(/[^0-9.]/g, "")) || 0.0;
    } else if (typeof price === "number") {
      cleanPrice = price;
    }

    // Determine stock status flag
    let stockStatus = 'In Stock';
    if (currentStock === 0) stockStatus = 'Out of Stock';
    else if (currentStock <= minReorder) stockStatus = 'Low Stock';

    // Insert into [inventory].[inventoryItem]
    const insertQuery = `
      INSERT INTO [inventory].[inventoryItem] 
        (itemType, itemName, stock, description, isDeleted, SKU, reorderAmount, price, stockStatus)
      VALUES 
        (@itemType, @itemName, @stock, @description, 0, @SKU, @reorderAmount, @price, @stockStatus)
    `;

    await pool.request()
      .input('itemType', sql.VarChar(100), finalType)
      .input('itemName', sql.VarChar(100), finalName)
      .input('stock', sql.Int, currentStock)
      .input('description', sql.VarChar(255), description || 'Cool Fix Inventory Item')
      .input('SKU', sql.VarChar(100), finalSKU)
      .input('reorderAmount', sql.Int, minReorder)
      .input('price', sql.Float, cleanPrice)
      .input('stockStatus', sql.VarChar(100), stockStatus)
      .query(insertQuery);

    console.log('[Cool Fix] Inventory item created successfully in Azure SQL!');
    res.status(201).json({ success: true, message: 'Inventory item added successfully!' });
  } catch (err) {
    console.error('[Cool Fix] SQL POST Inventory Error:', err.message);
    res.status(500).json({ success: false, message: `SQL Error: ${err.message}` });
  }
};

/**
 * PUT /api/admin/inventory/:itemId
 * Updates stock levels, prices, or reorder parameters for an item
 */
exports.updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { item, itemName, category, itemType, sku, SKU, stock, reorderAt, reorderAmount, price, description } = req.body;

    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database connection offline' });

    const finalName = item || itemName;
    const finalType = category || itemType;
    const finalSKU = sku || SKU;
    const currentStock = parseInt(stock, 10) || 0;
    const minReorder = parseInt(reorderAt || reorderAmount, 10) || 5;

    let cleanPrice = 0.0;
    if (typeof price === "string") {
      cleanPrice = parseFloat(price.replace(/[^0-9.]/g, "")) || 0.0;
    } else if (typeof price === "number") {
      cleanPrice = price;
    }

    let stockStatus = 'In Stock';
    if (currentStock === 0) stockStatus = 'Out of Stock';
    else if (currentStock <= minReorder) stockStatus = 'Low Stock';

    const updateQuery = `
      UPDATE [inventory].[inventoryItem]
      SET itemName = ISNULL(@itemName, itemName),
          itemType = ISNULL(@itemType, itemType),
          stock = @stock,
          price = @price,
          SKU = ISNULL(@SKU, SKU),
          reorderAmount = @reorderAmount,
          description = ISNULL(@description, description),
          stockStatus = @stockStatus
      WHERE itemID = @itemId
    `;

    await pool.request()
      .input('itemId', sql.Int, Number(itemId))
      .input('itemName', sql.VarChar(100), finalName || null)
      .input('itemType', sql.VarChar(100), finalType || null)
      .input('stock', sql.Int, currentStock)
      .input('price', sql.Float, cleanPrice)
      .input('SKU', sql.VarChar(100), finalSKU || null)
      .input('reorderAmount', sql.Int, minReorder)
      .input('description', sql.VarChar(255), description || null)
      .input('stockStatus', sql.VarChar(100), stockStatus)
      .query(updateQuery);

    console.log(`[Cool Fix] Updated inventory item #${itemId} successfully!`);
    res.status(200).json({ success: true, message: 'Item updated successfully!' });
  } catch (err) {
    console.error('[Cool Fix] SQL PUT Inventory Error:', err.message);
    res.status(500).json({ success: false, message: `SQL Error: ${err.message}` });
  }
};