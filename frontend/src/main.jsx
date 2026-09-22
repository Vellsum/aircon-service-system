// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>          {/* 1️⃣ Auth first — so useAuth() works everywhere */}
      <App />              {/* 2️⃣ App contains BrowserRouter + TechnicianWorkflowProvider */}
    </AuthProvider>
  </React.StrictMode>
)