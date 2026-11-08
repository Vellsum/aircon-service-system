//const API_BASE = 'http://localhost:5000/api'; //something tells me when hosting these need to change
//const API_BASE = 'https://aircon-service-system.onrender.com/api'
//const API_BASE = 'http://localhost:5000/api';
//const API_BASE = 'https://aircon-service-system.onrender.com/api'

const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api`;
/*
 *  THIS IS THE API
THIS IS A CONNECTOR FOR FRONTEND CODE TO CALL METHODS PROVIDED BY BACKEND
WHEN CALLING METHOD, THEY JUST PUT THE DATA IN THESE METHOD ARGUMENTS

THESE METHODS WHEN CALLED, SEND POST REQUEST TO BACKEND NODE  (cd backend, npm start, of localhost 5000)

 * 
 */


function getAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('aircon_token') || '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// Same pattern as TechnicianDashboard: read id from localStorage "user"
function getCurrentCustomerId() {
  
     try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    return stored.customer_ID || stored.customerId || stored.id || stored.user_ID || 1;
   // console.log('customer id: '+stored.customer_ID);
  } catch {
    return 1;
  }
}
/**
 * 
 *   function getCurrentCustomerId() {
  try { //chatgpt adviced
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    return stored.customer_ID ?? stored.customerId ?? null;
  } catch {
    return null;
  }
}

 */

//method to get bookings with assigned status
export const getIncomingBookings =()=> request(`/customer/incoming?customerId=${getCurrentCustomerId()}`);
export const purchaseSubscription = (customerID, planId) => {
  return request('/customer/subscriptions/purchase', {
    method: 'POST',
    body: JSON.stringify({
      customerID: getCurrentCustomerId(),
      subscriptionID: planId,
    }),
  });
};

export const chooseRROption=(bookingId,option)=>{
   return request(
    `/customer/bookings/${encodeURIComponent(bookingId)}/choose`,
    {
      method: "PUT",
      body: JSON.stringify(bookingId), option,
    }
  );
}
export const updateIncomingBookingStatus = (bookingId, status) => {
  return request(
    `/customer/bookings/${encodeURIComponent(bookingId)}/status`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    }
  );
};

export const getIncomingBookings_VITE = (customerId) => {
  return request(
    `/customer/incoming?customerId=${encodeURIComponent(customerId)}`
  );
};

export const getIncomingBookings_TEST = async (customerId) => {
  const url = `${API_BASE}/customer/incoming?customerId=${encodeURIComponent(customerId)}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  const text = await response.text();

  console.log("URL:", url);
  console.log("HTTP status:", response.status);
  console.log("Response body:", text);

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("The API returned HTML or invalid JSON.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to load incoming bookings");
  }

  return data;
};


/**
 * 
 * export const getIncomingBookings = async () => {
  const res = await fetch(
    `${API_BASE}/customer/bookings/assigned`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || "Failed to load assigned bookings"
    );
  }

  return data;
};
 */

//the request method that goes to routes n controller, return data. below methods call this with their argumemt as path for routes to decide which controller to use
/**
 * 
 *async function request(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.message || `Request failed (${res.status})`);
  return body;
}
 */

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || !body.success) {
    throw new Error(body.message || `Request failed (${res.status})`);
  }

  return body;
}
export const helpMyID = () => getCurrentCustomerId();
export const getDashboard = () => request(`/customer/dashboard?customerId=${getCurrentCustomerId()}`);
export const getMyBookings = () => request(`/customer/bookings?customerId=${getCurrentCustomerId()}`);
export const getMyUnits = () => request(`/customer/units?customerId=${getCurrentCustomerId()}`);

export async function rateBooking(bookingId, stars) {
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0 || bookingId > 2147483647
    || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error('Choose a rating from 1 to 5 for a valid booking.');
  }
  const headers = getAuthHeaders();
  if (headers.Authorization === 'Bearer ') {
    throw new Error('Please sign in again before rating this booking.');
  }
  let res;
  try {
    res = await fetch(`${API_BASE}/customer/bookings/${bookingId}/rate`, {
      method: 'POST', headers, body: JSON.stringify({ stars }),
    });
  } catch {
    throw Object.assign(new Error('The save outcome could not be confirmed. Refresh the booking before trying again.'), { uncertain: true });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || `Rating request failed (${res.status}).`);
  const rating = body?.rating;
  if (body?.success !== true || rating?.booking_ID !== bookingId || rating?.stars !== stars
    || !Number.isSafeInteger(rating?.technicianID) || rating.technicianID <= 0
    || typeof rating.submittedAt !== 'string' || !Number.isFinite(Date.parse(rating.submittedAt))) {
    throw Object.assign(new Error('The save outcome could not be confirmed. Refresh the booking before trying again.'), { uncertain: true });
  }
  return body;
}
export const getMySubscriptions = () => request(`/customer/subscriptions?customerId=${getCurrentCustomerId()}`);

export const getServices = () => request(`/customer/services`);
export const getPromotions = () => request(`/customer/promotions`);

export const getPlans = () => request(`/customer/plans`);
export const getAddresses = () => request(`/customer/addresses?customerId=${getCurrentCustomerId()}`);

export const getOtherAddresses=()=>request(`/customer/otherAddresses?customerId=${getCurrentCustomerId()}`);

export const makeNewExtraAddress_=(input,id)=>{
 request(`/customer/makeNewExtraAddress?customerId=${getCurrentCustomerId()}`, {
    method: "PUT",
    body: JSON.stringify({input,id} ),
  });
}

export const updateOtherAddress = (input,address_ID) =>{ // console.log(input)
 //console.log(address_ID)

  request(`/customer/editExtraAddress`, {
    method: "PUT",
    body: JSON.stringify({input, address_ID} ),
  });}


//the 3 picks for RR
export const pickRR1 = (bookingId) =>  {
    console.log("reached rr1 api")

  return request(`/customer/bookings/${encodeURIComponent(bookingId)}/RR1`,
     {
      method: "PUT",
      body: JSON.stringify({bookingId}),
    }
   );
  };
export const pickRR2 = (bookingId) =>  {
    console.log("reached rr2 api")

  return request(`/customer/bookings/${encodeURIComponent(bookingId)}/RR2`,
     {
      method: "PUT",
      body: JSON.stringify({bookingId}),
    }
   );
  };
export const pickRR3 = (bookingId) =>  {
    console.log("reached rr3 api")

  return request(`/customer/bookings/${encodeURIComponent(bookingId)}/RR3`,
     {
      method: "PUT",
      body: JSON.stringify({bookingId}),
    }
   );
  };

export const clone=(bookingId)=>{
      console.log("reached cloning api")
return request(`/customer/bookings/${encodeURIComponent(bookingId)}/clone`,
     {
      method: "PUT",
      body: JSON.stringify({bookingId}),
    }
   );
}
export const clone2=(bookingId)=>{
      console.log("reached cloning2 api")
return request(`/customer/bookings/${encodeURIComponent(bookingId)}/clone2`,
     {
      method: "PUT",
      body: JSON.stringify({bookingId}),
    }
   );
}
export const clone3=(bookingId)=>{
      console.log("reached cloning2 api")
return request(`/customer/bookings/${encodeURIComponent(bookingId)}/clone3`,
     {
      method: "PUT",
      body: JSON.stringify({bookingId}),
    }
   );
}
//export const pickRR2 = () => request(`/customer/bookings?customerId=${getCurrentCustomerId()}/RR2`);
//export const pickRR3 = () => request(`/customer/bookings?customerId=${getCurrentCustomerId()}/RR3`);

/**
 * 
 * the method will call a fetch() that takes the api route as the argument
 * server.js hears this 
 * 
 * 
 * this script does not deal with data themselves
 */
// Create a new booking for the current customer
export async function createBooking(payload) { //this method that is called by frontend is /customer
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
// ---- Customer profile (real DB) ----
export const getProfile = (customerId) =>
  request(`/customer/profile?customerId=${customerId}`);


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
