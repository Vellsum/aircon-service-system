const API_BASE = 'http://localhost:5000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// Same pattern as TechnicianDashboard: read id from localStorage "user"
function getCurrentCustomerId() {
  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    return stored.customer_ID || stored.customerId || stored.id || stored.user_ID || 1;
  } catch {
    return 1;
  }
}

async function request(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.message || `Request failed (${res.status})`);
  return body;
}

export const getDashboard = () => request(`/customer/dashboard?customerId=${getCurrentCustomerId()}`);
export const getMyBookings = () => request(`/customer/bookings?customerId=${getCurrentCustomerId()}`);
export const getMyUnits = () => request(`/customer/units?customerId=${getCurrentCustomerId()}`);
export const getMySubscriptions = () => request(`/customer/subscriptions?customerId=${getCurrentCustomerId()}`);

export const getServices = () => request(`/customer/services`);
export const getPromotions = () => request(`/customer/promotions`);

export const getPlans = () => request(`/customer/plans`);
export const getAddresses = () => request(`/customer/addresses?customerId=${getCurrentCustomerId()}`);

// Create a new booking for the current customer
export async function createBooking(payload) {
  const res = await fetch(`${API_BASE}/customer/bookings?customerId=${getCurrentCustomerId()}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.message || `Request failed (${res.status})`);
  return body;
}

// Cancel a booking by ID
export async function cancelBooking(bookingId) {
  const res = await fetch(`${API_BASE}/customer/bookings/${bookingId}/cancel?customerId=${getCurrentCustomerId()}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.message || `Request failed (${res.status})`);
  return body;
}

// ---------- Chatbot API (public, no auth needed) ----------
// NOTE: API_BASE already ends with "/api", so chatbot paths must NOT add "/api" again.

export async function sendChatMessage(message, history = []) {
  const res = await fetch(`${API_BASE}/chatbot/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export async function getChatbotFaq() {
  const res = await fetch(`${API_BASE}/chatbot/faq`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

// Update the logged-in customer's profile details
export async function updateProfile(payload) {
  const res = await fetch(`${API_BASE}/customer/profile?customerId=${getCurrentCustomerId()}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.message || `Request failed (${res.status})`);
  return body;
}