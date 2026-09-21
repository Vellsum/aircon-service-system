/**
 * Cool Fix - Admin Booking Router
 * Endpoint Mapping:
 *  - GET  /api/admin/bookings                 -> getAllBookings
 *  - GET  /api/admin/users/technicians        -> getTechnicians
 *  - POST /api/admin/bookings                 -> createBooking
 *  - PUT  /api/admin/bookings/:bookingId/status -> updateBookingStatus
 */

const express = require('express');
const router = express.Router();
const adminBookingController = require('../controllers/adminBookingController');

// GET all bookings
router.get('/', adminBookingController.getAllBookings);

// GET technician dropdown list
router.get('/technicians', adminBookingController.getTechnicians);

// POST create booking
router.post('/', adminBookingController.createBooking);

// PUT update booking
router.put('/:bookingId/status', adminBookingController.updateBookingStatus);

module.exports = router;