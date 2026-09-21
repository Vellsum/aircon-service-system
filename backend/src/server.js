const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Debug logger to trace incoming requests in terminal
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminInventoryRoutes = require('./routes/adminInventoryRoutes');
const adminBookingRoutes = require('./routes/adminBookingRoutes');
const technicianRoutes = require('./routes/technicianRoutes');

// Mount Routes (Standard structure)
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin/users', adminUserRoutes);
//app.use('/api/admin/inventory', adminInventoryRoutes);
// Register Inventory API route
app.use('/api/admin/inventory', require('./routes/adminInventoryRoutes'));
// Register Dashboard API route
app.use('/api/admin/dashboard', require('./routes/adminDashboardRoutes'));
app.use('/api/admin/bookings', adminBookingRoutes);
app.use('/api/technician', technicianRoutes);

// Test Root Route
app.get('/', (req, res) => {
  res.json({ message: 'AirCon Care backend is running!' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`AirCon Care backend running on http://localhost:${PORT}`);
});