/**
 * Cool Fix - Admin Booking Router
 * Endpoint Mapping:
 *  - GET  /api/admin/bookings                 -> getAllBookings
 *  - GET  /api/admin/users/technicians        -> getTechnicians
 *  - POST /api/admin/bookings                 -> createBooking
 *  - PUT  /api/admin/bookings/:bookingId/status -> updateBookingStatus
 */

const express = require('express');
//app.use(express.json());
const router = express.Router();
const adminBookingController = require('../controllers/adminBookingController');
router.put('/:bookingId/clone',adminBookingController.cloneBooking);
// GET all bookings
router.get('/', adminBookingController.getAllBookings);

// GET technician dropdown list
router.get('/technicians', adminBookingController.getTechnicians);

// POST create booking
router.post('/', adminBookingController.createBooking);

// PUT update booking
router.put('/:bookingId/status', adminBookingController.updateBookingStatus);
router.put(
  '/:bookingId/reassign',
  adminBookingController.reassignConfirmedBooking
);

router.put(
  '/:bookingId/reschedule',
  adminBookingController.rescheduleRequestedBooking
);

router.put('/:bookingId/alternatives',adminBookingController.submitBookingAlternatives);
router.put('/:bookingId/reserve',adminBookingController.makeReservedSlots)


//promos--------------------
router.get('/promo',adminBookingController.getPromotions)
router.post('/newPromo',adminBookingController.newPromo)
router.put('/editpromo',adminBookingController.editPromo)

//suscriptns-------------
router.get('/subscriptions',adminBookingController.getSubscriptions)
router.get('/subscriptions/services',adminBookingController.getServices)
router.post('/subscriptions',adminBookingController.addSubscription)  

router.put('/subscriptions/:subscriptionID',adminBookingController.editSubscription) 

module.exports = router;