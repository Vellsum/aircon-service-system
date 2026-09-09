const express = require('express');
const router = express.Router();
const {
    getAllBookings,
    updateBookingStatus,
    reassignTechnician
} = require('../controllers/adminBookingController');

router.get('/', getAllBookings);
router.put('/:bookingId/status', updateBookingStatus);
router.put('/:bookingId/reassign', reassignTechnician);

module.exports = router;