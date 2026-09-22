const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/adminDashboardController');

router.get('/dashboard/stats', adminDashboardController.getDashboardStats);
router.get('/dashboard/recent-bookings', adminDashboardController.getRecentBookings);
router.get('/dashboard/technicians', adminDashboardController.getTopTechnicians);

module.exports = router;