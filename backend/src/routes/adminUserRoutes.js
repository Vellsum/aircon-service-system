/**
 * Cool Fix - Admin User Routes
 * Mapped to adminUserController.js
 */

const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');

// Customer Endpoints
router.get('/customers', adminUserController.getAllCustomers);
router.post('/customers', adminUserController.createCustomer);

// Technician Endpoints
router.get('/technicians', adminUserController.getAllTechnicians);
router.post('/technicians', adminUserController.createTechnician);

module.exports = router;