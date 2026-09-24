/**
 * Cool Fix - Customer Portal Routes
 */

const express = require('express');
const router = express.Router();

const customerController = require('../controllers/customerController');

// Diagnostic check: Fallback inline handlers prevent server crash if a controller method is missing
const getDashboard = customerController.getDashboard || ((req, res) => res.status(500).json({ error: 'getDashboard missing in controller' }));
const getMyBookings = customerController.getMyBookings || ((req, res) => res.status(500).json({ error: 'getMyBookings missing in controller' }));
const getMyUnits = customerController.getMyUnits || ((req, res) => res.status(500).json({ error: 'getMyUnits missing in controller' }));

const getServices = customerController.getServices || ((req, res) => res.status(500).json({ error: 'getServices missing in controller' }));
const getPromotions = customerController.getPromotions || ((req, res) => res.status(500).json({ error: 'getPromotions missing in controller' }));
const getAddresses = customerController.getAddresses || ((req, res) => res.status(500).json({ error: 'getAddresses missing in controller' }));
const createBooking = customerController.createBooking || ((req, res) => res.status(500).json({ error: 'createBooking missing in controller' }));

router.get('/services', getServices);
router.get('/promotions', getPromotions);
router.get('/addresses', getAddresses);
router.post('/bookings', createBooking);

router.get('/dashboard', getDashboard);
router.get('/bookings', getMyBookings);
router.get('/units', getMyUnits);

module.exports = router;