import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TechnicianLayout from './layouts/TechnicianLayout'
import TechnicianDashboard from './pages/technician/TechnicianDashboard'
import TechnicianAssignedJobs from './pages/technician/TechnicianAssignedJobs'
import TechnicianSubmitReport from './pages/technician/TechnicianSubmitReport'
import TechnicianJobHistory from './pages/technician/TechnicianJobHistory'
import TechnicianFollowUp from './pages/technician/TechnicianFollowUp'
import TechnicianPartsLog from './pages/technician/TechnicianPartsLog'
import TechnicianPerformance from './pages/technician/TechnicianPerformance'
import TechnicianProfile from './pages/technician/TechnicianProfile'

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
          <Route path="follow-up" element={<TechnicianFollowUp />} />
          <Route path="job-history" element={<TechnicianJobHistory />} />
          <Route path="parts-log" element={<TechnicianPartsLog />} />
          <Route path="performance" element={<TechnicianPerformance />} />
          <Route path="profile" element={<TechnicianProfile />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/technician/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
