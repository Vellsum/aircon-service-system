import client from './client'; // Base Axios/Fetch instance pointing to your Express server
import { mockJobs } from '../data/technician/mockJobs';

// 1. Fetch assigned jobs for a technician
export async function getAssignedJobs(technicianId = 1) {
  try {
    const response = await client.get(`/api/technicians/${technicianId}/jobs`);
    return response.data;
  } catch (error) {
    console.warn('Backend API unavailable. Returning local fallback data:', error.message);
    
    // Fallback UI data
    return {
      success: true,
      data: [
        { id: 101, customerName: 'John Doe', location: '123 Pasir Ris Grove', serviceType: 'Aircon Chemical Wash', status: 'Assigned', date: '2026-03-25', time: '10:00 AM' },
        { id: 102, customerName: 'Jane Smith', location: '456 Orchard Road', serviceType: 'General Servicing', status: 'In Progress', date: '2026-03-25', time: '02:00 PM' }
      ]
    };
  }
}

// 2. Submit report / update job status
export async function updateJobStatus(jobId, payload) {
  try {
    const response = await client.put(`/api/technicians/jobs/${jobId}`, payload);
    return response.data;
  } catch (error) {
    console.warn('Backend API unavailable. Simulating success locally:', error.message);
    return { success: true, message: 'Status updated locally (Fallback)' };
  }
}