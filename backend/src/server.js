// backend/src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminInventoryRoutes = require('./routes/adminInventoryRoutes');
const adminBookingRoutes = require('./routes/adminBookingRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin/inventory', adminInventoryRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/bookings', adminBookingRoutes);


// Test route
app.get("/", (req, res) => {
    res.json({ message: "AirCon Care backend is running!" });
});

// Start server
app.listen(PORT, () => {
    console.log(`AirCon Care backend running on http://localhost:${PORT}`);
});