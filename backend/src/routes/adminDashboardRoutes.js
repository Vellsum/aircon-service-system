const express = require('express');
const router = express.Router();

const adminDashboardController = require('../controllers/adminDashboardController');

// main
router.get('/dashboard/summary', adminDashboardController.getDashboardSummary);

// legacy
router.get('/dashboard/stats', adminDashboardController.getDashboardStats);
router.get('/dashboard/recent-bookings', adminDashboardController.getRecentBookings);
router.get('/dashboard/technicians', adminDashboardController.getTechnicians);

module.exports = router;