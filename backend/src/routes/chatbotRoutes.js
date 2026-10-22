/**
 * Cool Fix - Chatbot Routes
 * Customer support bot endpoints (read-only, public)
 */

const express = require('express');
const router = express.Router();

const chatbotController = require('../controllers/chatbotController');

// Fallback pattern: if a controller method is missing, return a clear JSON error
// instead of crashing the whole server.
const getFaq = chatbotController.getFaq || ((req, res) =>
  res.status(500).json({ error: 'getFaq missing in chatbotController' }));

const postMessage = chatbotController.postMessage || ((req, res) =>
  res.status(500).json({ error: 'postMessage missing in chatbotController' }));

// Public endpoints (customer support bot - read-only, no auth needed)
router.get('/faq', getFaq);
router.post('/message', postMessage);

module.exports = router;