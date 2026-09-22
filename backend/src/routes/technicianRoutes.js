/**
 * Cool Fix - Technician Portal Routes
 * Centralized API endpoints for technician field operations
 */

const express = require('express');
const router = express.Router();

// Import technician controller
const technicianController = require('../controllers/technicianController');

// Diagnostic check: Fallback inline handlers prevent server crash if a controller method is missing
const getAssignedJobs = technicianController.getAssignedJobs || ((req, res) => res.status(500).json({ error: 'getAssignedJobs missing in controller' }));
const getTechnicianStats = technicianController.getTechnicianStats || ((req, res) => res.status(500).json({ error: 'getTechnicianStats missing in controller' }));
const updateJobStatus = technicianController.updateJobStatus || ((req, res) => res.status(500).json({ error: 'updateJobStatus missing in controller' }));
const getTechnicianProfile = technicianController.getTechnicianProfile
  || ((req, res) => res.status(500).json({ error: 'getTechnicianProfile missing in controller' }));

router.get('/profile', getTechnicianProfile);
// Express GET: Retrieve assigned jobs for active technician
router.get('/jobs', getAssignedJobs);

// Express GET: Retrieve field operational metrics
router.get('/stats', getTechnicianStats);

// Express PUT: Update job status in Azure SQL
router.put('/jobs/:bookingId/status', updateJobStatus);

module.exports = router;