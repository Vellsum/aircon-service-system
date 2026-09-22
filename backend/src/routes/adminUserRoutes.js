const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');

// Technicians
router.get('/users/technicians', adminUserController.getAllTechnicians);
router.post('/users/technicians', adminUserController.createTechnician);
router.put('/users/technicians/:id', adminUserController.updateTechnician);
router.delete('/users/technicians/:id', adminUserController.deleteTechnician);

// Customers
router.get('/users/customers', adminUserController.getAllCustomers);
router.post('/users/customers', adminUserController.createCustomer);
router.put('/users/customers/:id', adminUserController.updateCustomer);
router.delete('/users/customers/:id', adminUserController.deleteCustomer);

module.exports = router;