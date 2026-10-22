const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * I AM LOCALHOST 5000
 * I AM THE BACKEND SERVER
 * I AM THE THING THAT RUNS WHEN U CD BACKEND NPM START
 * 
 * routes - see the url n map to the method
 * 
 * controller - do sql query
 * 
 * this script does not deal with data themselves
 */

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

/**
 * below it takes the different scripts from routes n connect them to a name
 */
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

const customerRoutes = require('./routes/customerRoutes');

// Chatbot Routes
const chatbotRoutes = require('./routes/chatbotRoutes');
app.use('/api/chatbot', chatbotRoutes);

/**this name is set so that with the below api url, it goes to that script 
 * 
 * so when api is calling the fetch method, server gets this
 * server looks at the url n maps it to below routes
 * 
 * so above it imports the route scripts
 * below it assigns each scrip to the api url
 * 
 * api fetch method -> server sees the url link -> give the correct route 
 *  -> then the route decide which controller  to call
 * 
*/
// Mount Routes
app.use('/api/auth', authRoutes);
//app.use('/api/bookings', bookingRoutes);   //bookingroutes. js is abandaoned
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/admin/inventory', adminInventoryRoutes);
app.use('/api/admin/bookings', adminBookingRoutes);
app.use('/api/technician', technicianRoutes);
app.use('/api/technician/reports', technicianReportRoutes);
app.use('/api/admin/payables', adminPayablesRoutes);

app.use('/api/customer', customerRoutes); // the api from frpntend goes here, NOT above booking, when customer create booking...

app.get('/', (req, res) =>! res.json({ message: 'Cool Fix backend active!' }));

app.listen(PORT, () => {
  console.log(`Cool Fix backend active on http://localhost:${PORT}`);
});