import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/public/Home";
import Login from "./pages/public/Login";

import AdminDashboard from "./pages/AdminDashboard";
import ManageBookings from "./pages/ManageBookings";
import ManageTechnicians from "./pages/ManageTechnicians";
import ManageCustomers from "./pages/ManageCustomers";
import ManageAircon from "./pages/ManageAircon";
import ManageServices from "./pages/ManageServices";
import ManagePackages from "./pages/ManagePackages";
import ManagePromotions from "./pages/ManagePromotions";
import ManageInventory from "./pages/ManageInventory";
import ViewReports from "./pages/ViewReports";
import Analytics from "./pages/Analytics";

import CustomerPortal from "./pages/portals/CustomerPortal";
import TechnicianPortal from "./pages/portals/TechnicianPortal";

function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* Admin — requires aircon_role === "admin" */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/bookings" element={<ManageBookings />} />
        <Route path="/technicians" element={<ManageTechnicians />} />
        <Route path="/customers" element={<ManageCustomers />} />
        <Route path="/aircons" element={<ManageAircon />} />
        <Route path="/services" element={<ManageServices />} />
        <Route path="/packages" element={<ManagePackages />} />
        <Route path="/promotions" element={<ManagePromotions />} />
        <Route path="/inventory" element={<ManageInventory />} />
        <Route path="/reports" element={<ViewReports />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>

      {/* Customer — requires aircon_role === "customer" */}
      <Route element={<ProtectedRoute role="customer" />}>
        <Route path="/customer" element={<CustomerPortal />} />
      </Route>

      {/* Technician — requires aircon_role === "technician" */}
      <Route element={<ProtectedRoute role="technician" />}>
        <Route path="/technician-portal" element={<TechnicianPortal />} />
      </Route>
    </Routes>
  );
}

export default App;
