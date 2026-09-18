const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');

// GET /api/technicians/:technicianId/jobs
router.get('/:technicianId/jobs', technicianController.getAssignedJobs);

// PUT /api/technicians/jobs/:jobId
router.put('/jobs/:jobId', technicianController.updateJobStatus);

module.exports = router;