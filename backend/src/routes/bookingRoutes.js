// backend/src/routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// GET /api/bookings/services
router.get('/services', bookingController.getServices);

// POST /api/bookings
router.post('/', bookingController.createBooking);

// MUST HAVE THIS AT THE BOTTOM:
module.exports = router;