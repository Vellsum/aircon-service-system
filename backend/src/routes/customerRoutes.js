/**
 * Cool Fix - Customer Portal Routes
 * 
 * this script used when customer create booking
 * fucking heell the ai code
 */

const express = require('express');
const router = express.Router();

const customerController = require('../controllers/customerController');
//to get incoming booking
const getINCOMING= customerController.getINCOMING;


// Diagnostic check: Fallback inline handlers prevent server crash if a controller method is missing
const getDashboard = customerController.getDashboard || ((req, res) => res.status(500).json({ error: 'getDashboard missing in controller' }));
const getMyBookings = customerController.getMyBookings || ((req, res) => res.status(500).json({ error: 'getMyBookings missing in controller' }));
const getMyUnits = customerController.getMyUnits || ((req, res) => res.status(500).json({ error: 'getMyUnits missing in controller' }));
const getMySubscriptions = customerController.getMySubscriptions || ((req, res) => res.status(500).json({ error: 'getMySubscriptions missing in controller' }));
const registerUnit = customerController.registerUnit || ((req, res) => res.status(500).json({ error: 'registerUnit missing in controller' }));
const cancelBooking = customerController.cancelBooking || ((req, res) => res.status(500).json({ error: 'cancelBooking missing in controller' }));

const getServices = customerController.getServices || ((req, res) => res.status(500).json({ error: 'getServices missing in controller' }));
const getPromotions = customerController.getPromotions || ((req, res) => res.status(500).json({ error: 'getPromotions missing in controller' }));
const getAddresses = customerController.getAddresses || ((req, res) => res.status(500).json({ error: 'getAddresses missing in controller' }));
const createBooking = customerController.createBooking || ((req, res) => res.status(500).json({ error: 'createBooking missing in controller' }));
const getPlans = customerController.getPlans || ((req, res) => res.status(500).json({ error: 'getPlans missing in customerController' }));
router.get('/plans', getPlans);

// ---- Customer profile (real DB) ----
router.get('/profile', customerController.getProfile);
router.put('/profile', customerController.updateProfile);

router.get('/dashboard', getDashboard);
router.get('/bookings', getMyBookings);
router.get('/units', getMyUnits);
router.post('/units', registerUnit);
router.get('/subscriptions', getMySubscriptions);
router.get('/services', getServices);
router.get('/promotions', getPromotions);
router.get('/addresses', getAddresses);
router.post('/bookings', createBooking);  //to make booking
router.put('/bookings/:bookingId/cancel', cancelBooking);


//customer approve/reject
//const validateBooking = customerController. updateIncomingBookingStatus;
//router.put("/bookings/:bookingId/status", validateBooking);
const authenticateToken = require('./authMiddleware');
//the RR options
router.put("/bookings/:bookingId/RR1",authenticateToken, customerController.pickRR1)
router.put("/bookings/:bookingId/RR2",authenticateToken, customerController.pickRR2)
router.put("/bookings/:bookingId/RR3",authenticateToken, customerController.pickRR3)


router.put("/bookings/:bookingId/status",authenticateToken, customerController.updateIncomingBookingStatus);   // <--- doesnt work
router.put("/bookings/:bookingId/choose/:option", authenticateToken,customerController.chooseRROption)
router.get('/incoming', getINCOMING);
module.exports = router;

//module.exports.updateIncomingBookingStatus = updateIncomingBookingStatus;