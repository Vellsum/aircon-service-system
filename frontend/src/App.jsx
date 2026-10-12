// src/App.jsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { TechnicianWorkflowProvider } from './context/TechnicianWorkflowContext';

export default function App() {
  return (
    <BrowserRouter>
      <TechnicianWorkflowProvider>
        <AppRoutes />
      </TechnicianWorkflowProvider>
    </BrowserRouter>
  );
}