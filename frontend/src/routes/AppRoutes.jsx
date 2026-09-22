import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from "../components/common/ProtectedRoute";

// HomePage & Login, Register
import Home from "../pages/public/Home";
import Login from "../pages/public/Login";
import Register from "../pages/public/Register";

// Customer Module Pages (src/pages/customer/)
import CustomerPortal from "../pages/customer/CustomerPortal";
import CustomerDashboard from "../pages/customer/CustomerDashboard";
import CustomerBookService from "../pages/customer/CustomerBookService";
import CustomerBookings from "../pages/customer/CustomerBookings";
import CustomerServiceCatalog from "../pages/customer/CustomerServiceCatalog";
import CustomerMyUnits from "../pages/customer/CustomerMyUnits";
import CustomerProfile from "../pages/customer/CustomerProfile";

// Layouts
import TechnicianLayout from '../layouts/TechnicianLayout';
import CustomerLayout from '../layouts/CustomerLayout';

// 1. Admin Module Pages (src/pages/admin/)
import AdminDashboard from '../pages/admin/AdminDashboard';
import ManageBookings from '../pages/admin/ManageBookings';
import ManageInventory from '../pages/admin/ManageInventory';
import ManageTechnicians from '../pages/admin/Managetechnicians';
import ManageCustomers from '../pages/admin/Managecustomers';
import Manageservices from "../pages/admin/Manageservices";
import ManagePromotions from "../pages/admin/Managepromotions";
import ManageAircon from '../pages/admin/ManageAircon';
import ManagePackages from '../pages/admin/Managepackages';
import ViewReports from '../pages/admin/Viewreports';

// 2. Technician Module Pages (src/pages/technician/)
import TechnicianDashboard from '../pages/technician/TechnicianDashboard';
import TechnicianAssignedJobs from '../pages/technician/TechnicianAssignedJobs';
import TechnicianSubmitReport from '../pages/technician/TechnicianSubmitReport';
import TechnicianJobHistory from '../pages/technician/TechnicianJobHistory';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/bookings" element={<ManageBookings />} />
        <Route path="/admin/inventory" element={<ManageInventory />} />
        <Route path="/admin/services" element={<Manageservices />} />
        <Route path="/admin/technicians" element={<ManageTechnicians />} />
        <Route path="/admin/customers" element={<ManageCustomers />} />
        <Route path="/admin/promotions" element={<ManagePromotions />} />
        <Route path="/admin/aircon" element={<ManageAircon />} />
        <Route path="/admin/packages" element={<ManagePackages />} />
        <Route path="/admin/reports" element={<ViewReports />} />
      </Route>
      
      {/* Technician Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={["technician"]} />}>
        <Route path="/technician" element={<TechnicianLayout />}>
          <Route index element={<Navigate to="/technician/dashboard" replace />} />
          <Route path="dashboard" element={<TechnicianDashboard />} />
          <Route path="assigned-jobs" element={<TechnicianAssignedJobs />} />
          <Route path="submit-report" element={<TechnicianSubmitReport />} />
          <Route path="job-history" element={<TechnicianJobHistory />} />
        </Route>
      </Route>

      {/* Customer Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="book" element={<CustomerBookService />} />
          <Route path="bookings" element={<CustomerBookings />} />
          <Route path="services" element={<CustomerServiceCatalog />} />
          <Route path="units" element={<CustomerMyUnits />} />
          <Route path="profile" element={<CustomerProfile />} />
        </Route>
        {/* Legacy link target — redirects to the dashboard */}
        <Route path="/customer/portal" element={<CustomerPortal />} />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}