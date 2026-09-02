import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TechnicianLayout from './layouts/TechnicianLayout'
import TechnicianDashboard from './pages/technician/TechnicianDashboard'
import TechnicianAssignedJobs from './pages/technician/TechnicianAssignedJobs'
import TechnicianSubmitReport from './pages/technician/TechnicianSubmitReport'
import TechnicianModulePlaceholder from './pages/technician/TechnicianModulePlaceholder'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to technician dashboard */}
        <Route path="/" element={<Navigate to="/technician/dashboard" replace />} />

        {/* Technician Portal Routes */}
        <Route path="/technician" element={<TechnicianLayout />}>
          <Route index element={<Navigate to="/technician/dashboard" replace />} />
          <Route path="dashboard" element={<TechnicianDashboard />} />
          <Route path="assigned-jobs" element={<TechnicianAssignedJobs />} />
          <Route path="submit-report" element={<TechnicianSubmitReport />} />
          <Route path="follow-up" element={<TechnicianModulePlaceholder title="Follow-Up" />} />
          <Route path="job-history" element={<TechnicianModulePlaceholder title="Job History" />} />
          <Route path="parts-log" element={<TechnicianModulePlaceholder title="Parts Log" />} />
          <Route path="performance" element={<TechnicianModulePlaceholder title="Performance" />} />
          <Route path="profile" element={<TechnicianModulePlaceholder title="Profile" />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/technician/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App