const express = require('express');
const router = express.Router();
const {
    getAllInventory,
    addInventoryItem,
    updateStock,
    softDeleteInventoryItem
} = require('../controllers/adminInventoryController');

router.get('/', getAllInventory);
router.post('/', addInventoryItem);
router.put('/:itemId/stock', updateStock);
router.delete('/:itemId', softDeleteInventoryItem);

module.exports = router;