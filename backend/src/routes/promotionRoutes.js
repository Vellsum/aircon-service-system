// backend/src/routes/promotionRoutes.js
const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

router.get('/', promotionController.listPromotions);
router.post('/', promotionController.createPromotion);
router.put('/:id', promotionController.updatePromotion);

module.exports = router;