/**
 * Cool Fix - Admin Dashboard Routes
 * Endpoints:
 *  - GET /api/admin/dashboard/stats -> getDashboardStats
 */

const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/adminDashboardController');

// GET dashboard summary stats
router.get('/stats', adminDashboardController.getDashboardStats);

module.exports = router;