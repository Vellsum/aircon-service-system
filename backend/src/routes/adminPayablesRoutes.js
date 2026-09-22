const express = require('express');
const router = express.Router();
const adminPayablesController = require('../controllers/adminPayablesController');

// Services Routes
router.get('/services', adminPayablesController.getAllServices);
router.post('/services', adminPayablesController.createService);
router.put('/services/:id', adminPayablesController.updateService);
router.delete('/services/:id', adminPayablesController.deleteService);

// Packages Routes
router.get('/packages', adminPayablesController.getAllPackages);
router.post('/packages', adminPayablesController.createPackage);

module.exports = router;