const { sql, poolPromise } = require('../config/db');

// 1. GET /api/admin/inventory - Fetch all active inventory items
const getAllInventory = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                i.itemID,
                i.itemName,
                i.itemType,
                i.stock,
                i.description,
                i.isDeleted,
                a.aircon_ID,
                a.aircon_model,
                a.aircon_make,
                a.aircon_type,
                a.aircon_serialNumber,
                a.aircon_warrantyNumber,
                a.isInstalled
            FROM inventory.inventoryItem i
            LEFT JOIN inventory.aircon a ON i.itemID = a.itemID
            WHERE i.isDeleted = 0
            ORDER BY i.itemID DESC
        `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ success: false, message: 'Database query failed', error: error.message });
    }
};

// 2. POST /api/admin/inventory - Add a new inventory item
const addInventoryItem = async (req, res) => {
    const { itemName, itemType, stock, description } = req.body;

    if (!itemName || !itemType || stock === undefined) {
        return res.status(400).json({ success: false, message: 'itemName, itemType, and stock are required.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('itemName', sql.VarChar(100), itemName)
            .input('itemType', sql.VarChar(100), itemType)
            .input('stock', sql.Int, stock)
            .input('description', sql.VarChar(255), description || null)
            .query(`
                INSERT INTO inventory.inventoryItem (itemName, itemType, stock, description, isDeleted)
                VALUES (@itemName, @itemType, @stock, @description, 0);
                SELECT SCOPE_IDENTITY() AS itemID;
            `);

        res.status(201).json({
            success: true,
            message: 'Inventory item added successfully.',
            itemID: result.recordset[0].itemID
        });
    } catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ success: false, message: 'Failed to add inventory item.', error: error.message });
    }
};

// 3. PUT /api/admin/inventory/:itemId/stock - Update stock level
const updateStock = async (req, res) => {
    const { itemId } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock < 0) {
        return res.status(400).json({ success: false, message: 'Valid stock quantity is required.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('itemID', sql.Int, itemId)
            .input('stock', sql.Int, stock)
            .query(`
                UPDATE inventory.inventoryItem
                SET stock = @stock
                WHERE itemID = @itemID AND isDeleted = 0
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Item not found or has been deleted.' });
        }

        res.status(200).json({
            success: true,
            message: `Stock updated to ${stock} for item ID ${itemId}.`
        });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ success: false, message: 'Failed to update stock.', error: error.message });
    }
};

// 4. DELETE /api/admin/inventory/:itemId - Soft delete item
const softDeleteInventoryItem = async (req, res) => {
    const { itemId } = req.params;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('itemID', sql.Int, itemId)
            .query(`
                UPDATE inventory.inventoryItem
                SET isDeleted = 1
                WHERE itemID = @itemID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Item not found.' });
        }

        res.status(200).json({
            success: true,
            message: `Inventory item ID ${itemId} soft-deleted successfully.`
        });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ success: false, message: 'Failed to delete item.', error: error.message });
    }
};

module.exports = {
    getAllInventory,
    addInventoryItem,
    updateStock,
    softDeleteInventoryItem
};