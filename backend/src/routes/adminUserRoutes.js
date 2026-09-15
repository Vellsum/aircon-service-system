const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    createTechnician,
    softDeleteUser
} = require('../controllers/adminUserController');

// Route mapping
router.get('/', getAllUsers);
router.post('/technician', createTechnician);
router.delete('/:userId', softDeleteUser);

module.exports = router;