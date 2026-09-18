import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// 1. Import Meet Samir's Admin Pages
//import AdminBookings from '../pages/admin/AdminBookings';
//import AdminInventory from '../pages/admin/AdminInventory';

// 2. Import Min Thaw Tar's Technician Pages
//import TechnicianDashboard from '../pages/technician/TechnicianDashboard';
import TechnicianAssignedJobs from '../pages/technician/TechnicianAssignedJobs';
//import TechnicianSubmitReport from '../pages/technician/TechnicianSubmitReport';
//import TechnicianJobHistory from '../pages/technician/TechnicianJobHistory';
//import TechnicianModulePlaceholder from '../pages/technician/TechnicianModulePlaceholder';


// 3. Import Aekkaphone's Customer Pages
//import CustomerPortal from '../pages/customer/CustomerPortal';
//import ServiceCatalog from '../pages/customer/ServiceCatalog';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/bookings" replace />} />

      {/* Admin Module */}
      <Route path="/admin/bookings" element={<AdminBookings />} />
      <Route path="/admin/inventory" element={<AdminInventory />} />

      {/* Technician Module */}
      <Route path="/technician/dashboard" element={<TechnicianDashboard />} />
      <Route path="/technician/assigned-jobs" element={<TechnicianAssignedJobs />} />
      <Route path="/technician/submit-report" element={<TechnicianSubmitReport />} />
      <Route path="/technician/job-history" element={<TechnicianJobHistory />} />
      <Route path="/technician/module-placeholder" element={<TechnicianModulePlaceholder />} />


      {/* Customer Module */}
      <Route path="/customer/portal" element={<CustomerPortal />} />
      <Route path="/customer/services" element={<ServiceCatalog />} />

      <Route path="*" element={<div className="p-6">404 - Page Not Found</div>} />
    </Routes>
  );
}