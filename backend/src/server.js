const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ✅ FIXED Logger
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminInventoryRoutes = require('./routes/adminInventoryRoutes');
const adminBookingRoutes = require('./routes/adminBookingRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const technicianReportRoutes = require('./routes/technicianReports');
const adminPayablesRoutes = require('./routes/adminPayablesRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/admin/inventory', adminInventoryRoutes);
app.use('/api/admin/bookings', adminBookingRoutes);
app.use('/api/technician', technicianRoutes);
app.use('/api/technician/reports', technicianReportRoutes);
app.use('/api/admin/payables', adminPayablesRoutes);

app.get('/', (req, res) =>! res.json({ message: 'Cool Fix backend active!' }));

app.listen(PORT, () => {
  console.log(`Cool Fix backend active on http://localhost:${PORT}`);
});