/**
 * Cool Fix - Technician Report Routes
 * Same pattern as technicianRoutes.js
 */

const express = require('express');
const router = express.Router();

const technicianReportController = require('../controllers/technicianReportController');

// Diagnostic fallbacks (same pattern as technicianRoutes.js)
const submitReport = technicianReportController.submitReport
  || ((req, res) => res.status(500).json({ error: 'submitReport missing in controller' }));
const getReports = technicianReportController.getReports
  || ((req, res) => res.status(500).json({ error: 'getReports missing in controller' }));
const getReportById = technicianReportController.getReportById
  || ((req, res) => res.status(500).json({ error: 'getReportById missing in controller' }));
// Add this with the other route definitions:
const getPartsLog = technicianReportController.getPartsLog
  || ((req, res) => res.status(500).json({ error: 'getPartsLog missing in controller' }));

// Add this route:
router.get('/parts-log', getPartsLog);

  
router.post('/', submitReport);
router.get('/', getReports);
router.get('/:id', getReportById);

module.exports = router;