// backend/src/routes/packageRoutes.js
const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');

router.get('/', packageController.listPackages);
router.get('/services', packageController.listServices);
router.post('/', packageController.createPackage);
router.put('/:id', packageController.updatePackage);

module.exports = router;