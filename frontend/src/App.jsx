// src/App.jsx
import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import ChatbotWidget from './components/customer/ChatbotWidget';

// ✅ NEW: inner component — it renders INSIDE <BrowserRouter>, so useLocation() works
function AppContent() {
  const location = useLocation();

  // Chatbot shows on the homepage + all customer pages only
  const isHomepage = location.pathname === "/";
  const isCustomerPage = location.pathname.startsWith("/customer");
  const showChatbot = isHomepage || isCustomerPage;

  return (
    <>
      <AppRoutes />

      {/* ✅ one line at the end, outside the routes */}
      {showChatbot && <ChatbotWidget />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
