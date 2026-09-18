// frontend/src/api/technicianApi.js
// frontend/src/api/technicianApi.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const getAssignedJobs = async (technicianId) => {
  try {
    const response = await fetch(`${API_BASE}/technician/assigned-jobs/${technicianId}`);
    if (!response.ok) return null; // Return null on HTTP errors (e.g., 404/500)
    const result = await response.json();
    return result.data || result;
  } catch (err) {
    console.warn('Backend endpoint unavailable. Falling back to mock data.');
    return null; // Return null on network error
  }
};

// POST/PUT: Submit a service report (Note: Check FK order with Wei Jie when creating records!)
export const submitServiceReport = async (reportData) => {
  const response = await fetch(`${API_BASE}/technician/submit-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) {
    throw new Error('Failed to submit service report');
  }
  return response.json();
};