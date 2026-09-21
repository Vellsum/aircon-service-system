const express = require('express');
const router = express.Router();
const adminInventoryController = require('../controllers/adminInventoryController');

router.get('/', adminInventoryController.getAllInventory);
router.post('/', adminInventoryController.createItem);
router.put('/:itemId', adminInventoryController.updateItem);

module.exports = router;