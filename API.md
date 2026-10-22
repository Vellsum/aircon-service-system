🌐 AirCon Care — Backend API Reference
Base URL (dev): http://localhost:5000/api

Conventions:
- All responses are flat JSON with success: true/false
- Dates: YYYY-MM-DD · Times: HH:MM or HH:MM:SS
- Identity via query param (?customerId= / ?techId=) — from localStorage.userafter login (customer_ID / technician_ID, NOT the topUser id)
- Requests accept Authorization: Bearer <token>; backend enforces businessrules server-side (see Business Rules)

Where routes are mounted (server.js): /api/auth, /api/admin/...,/api/technician, /api/technician/reports, /api/customer, /api/bookings

📑 Contents
1.Auth
2.Customer
3.Technician
4.Technician Reports
5.Admin — Bookings
6.Admin — Dashboard
7.Admin — Users
8.Admin — Inventory
9.Admin — Payables
10.Legacy /api/bookings
11.Business Rules
12.DB Status Values

1.Auth — /api/auth

Method	   Path	                      Purpose
POST	   /api/auth/register	        Register a Customer (creates topUser + newCustomer)
POST	   /api/auth/login	          Unified login — all 3 roles
POST	   /api/auth/reset-password	  Set a new password for a username

POST /api/auth/register
{ "username": "newuser", "password": "pass123", "customer_name": "Full Name", "customer_address": "Singapore" }
201: { "success": true, "user": { "id": 10, "user_ID": 10, "customer_ID": 206, "username": "newuser", "role": "Customer" } }

POST /api/auth/login
{ "username": "scott", "password": "customer123", "role": "Customer" }
role optional — mismatch with the account → 400.

200:

{ "success": true, "token": "<JWT>",  "user": { "id": 9, "user_ID": 9, "technician_ID": null, "customer_ID": 205,            "username": "scott", "role": "Customer", "accountType": "Customer" } }
Important: the frontend stores this whole object (localStorage key user)and uses customer_ID / technician_ID from it for all module calls.

POST /api/auth/reset-password
{ "username": "tech_chen", "newPassword": "tech123" }
200: { "success": true, "message": "Password reset for tech_chen." }

2. Customer — /api/customer (all take ?customerId= where noted)

Method	         Path	                                 Purpose
GET     	/customer/dashboard	                  Everything for the dashboard in one call
GET	      /customer/bookings	                  All bookings (wizard shape: unit_ids, technician, report)
POST	    /customer/bookings	                  Create a booking (wizard submit)
PUT	      /customer/bookings/:bookingId/cancel	Cancel an open booking
POST	    /customer/bookings/:bookingId/rate	  Rate a completed booking (1–5, once)
GET	      /customer/units	                      Registered units + derived next_due / health
POST	    /customer/units	                      Register a unit
GET	      /customer/services	                  Active services (wizard step 1)
GET	      /customer/promotions	                Active promos (wizard promo panel)
GET	      /customer/addresses	                  Address (from the customer record)

GET /customer/dashboard?customerId=205
{ "success": true,  "profile": { "customer_ID": 205, "customer_name": "Scott Sum",
"loyalty_points": 4, "address": "123 Bukit Timah Road" }, 
"stats": { "upcoming": 2, "units": 2, "completed": 3, "totalSpend": 380 }, 
"nextBooking": { "booking_ID": 1007, "date": "2026-10-08", "time": "2:00 PM", "status": "Assigned",  
"location": "...", "service_name": "Chemical Wash", "amount": 90,  
"unit_ids": [404, 405], "units": ["Daikin FTKM25"],     
"technician": { "name": "Raj Kumar", "rating": 4, "jobs_done": 98 }, "report": null }, 
"recent": [ /* same booking shape, max 4 past */ ], 
"units": [ { "installed_ID": 404, "nickname": "Daikin FTKM25", "brand": "Daikin", "model": "FTKM25",  
"type": "Split", "serial_number": "...", "last_service": "2026-08-27", 
"next_due": "2026-11-25", "service_count": 1, "health": 85 } ] }

POST /customer/bookings?customerId=205
{ "serviceId": 12, "date": "2026-10-20", "time": "14:00",  "location": "123 Bukit Timah Road",
"comments": "Unit leaking", "promoCode": "WELCOME10" }
201: { "success": true, "booking_ID": 1014, "reference": "BK-2026-1014" }
(creates the booking and its job+work link; records promo usage)

PUT /customer/bookings/:bookingId/cancel
Only Pending/Confirmed/Scheduled/Assigned. 400: A Completed booking can no longer be cancelled...

POST /customer/bookings/:bookingId/rate
{ "stars": 4 }
Completed-only, once per booking; recomputes technician average.400: You already rated this service.
/ You can only rate completed services.

POST /customer/units?customerId=205
{ "brand": "Daikin", "model": "FTKM50", "type": "Split", "serialNumber": "SN-001" }
201: { "success": true, "installed_ID": 406, "nickname": "Daikin FTKM50" }

GET /customer/services →
{ "success": true, "services": [ { "service_id": 10, "service_name":
"General Servicing (1 Unit)",  "description": "...", "price": 40, "unit_label":
"per unit", "duration_mins": 30,  "icon": "snowflake", "includes": ["..."] } ] }

GET /customer/promotions →
{ "success": true, "promotions": [ { "code": "WELCOME10", "title": "New Customer Discount",
"description": "...", "discount_type": "fixed", "discount_value": 10 } ] }

GET /customer/addresses?customerId=205 →
{ "success": true, "addresses": [ { "address_ID": 1, "label": "Home", "line": "...", "postal": "", "isDefault": true } ] }


3. Technician — /api/technician (all take ?techId=)
⚠️ techId = technician_ID from user3.technician (e.g. 104), never the topUser id.


Method	           Path	                        Purpose
GET       	/technician/jobs	                  Assigned jobs (formatted)
GET	        /technician/profile                 Name / rating / specialty / jobsDone
GET       	/technician/stats	                  Count summary
PUT	        /technician/jobs/:bookingId/status	Status transitions (gated — see §11)

GET /technician/jobs?techId=104

{ "success": true, "technicianName": "Henrick",  "jobs": [ { "job_ID": 1013, "id": "#BK1013", "customer_ID": 205,  
"customerName": "Scott Sum", "serviceType": "Aircon Servicing",  
"unitType": "Wall-Mounted Split System", "date": "2026-10-13",   
"formattedDate": "Tue, 13 Oct 2026", "time": "9:00 AM", "time24": "09:00",    
"estimatedDuration": "60 mins", "timeframe": "this-week",  
"status": "Scheduled", "address": "...", "isFollowup": false, "notes": "..." } ] }

PUT /technician/jobs/:bookingId/status
{ "status": "In Progress" }
200: { "success": true, "message": "Status updated successfully!" }400 examples (show message to the user):

- This job is scheduled for 2026-10-13 — it cannot be started before its booking date.
- This job is scheduled for today at 14:00 — starting unlocks at that time.
- This job hasn't been started yet (status: scheduled). Start it on its booking date, submit the report, then complete.
- A service report must be submitted BEFORE completing this job...


4. Technician Reports — /api/technician/reports


Method	             Path                       	                Purpose
POST 	     /api/technician/reports	                  Submit the service report (In Progress only)
GET	       /api/technician/reports?techId=	          All reports by the technician
GET	       /api/technician/reports/parts-log?techId=	Parts usage + inventory + booking context
GET        /api/technician/reports/:id	              Single report + customer name

POST /api/technician/reports
{ "job_ID": 1012,  "findings": ["Dirty / clogged filter"], "findingsOther": null,
"actionsTaken": ["Cleaned coil"], "actionsOther": null,  "overallCondition": "Good", 
"checklistItems": ["filter-cleaned"],  "materials": [ { "itemID": 306, "itemName": "Drain Hose", "quantity": 1, "unitCost": 18.5 } ], 
"materialsTotal": 18.5,  "followUpRequired": true, "followUpReasons": ["Recheck drainage"],  "followUpOtherReason": null,
"followUpDate": "2026-10-20", "followUpPriority": "Normal", 
"completionDateTime": "2026-10-08T15:30",  "customerAcknowledged": true, "internalNotes": null }
201: { "success": true, "reportID": 8009, "message": "...You can now mark the job as completed." }400: 
Reports can only be submitted while the job is In Progress...Side effect: 
followUpRequired: true auto-creates the return booking
(isFollowup=1, same tech, Scheduled, +followUpDate or +7 days, with job+work link).

GET .../parts-log records include:
reportID, itemID, itemName, itemType, currentStock, quantityUsed,
unitCost, jobID, displayJobCode (#BKxxx), bookingID, customerName, bookingDate,
bookingTime, location, jobStatus

5. Admin — Bookings — /api/admin/bookings
Method	           Path	                            Purpose
GET	     /admin/bookings	                  All bookings + names
GET	     /admin/bookings/technicians	      Technician list for the assign dropdown
POST	   /admin/bookings	                  Create booking
PUT	     /admin/bookings/:bookingId/status	Status / reassign / reschedule

GET /admin/bookings →
{ "success": true, "bookings": [ { "booking_ID": 1013, "customer_ID": 205,
"technician_ID": 104,  "booking_date": "2026-10-13", "time": "09:00:00", 
"location": "...", "status": "Scheduled",  "comments": "...", "customer_name": "Scott Sum",
"technician_name": "Henrick" } ] }

POST /admin/bookings
{ "customer_ID": 205, "technician_ID": 104, "booking_date": "2026-10-20", 
"time": "14:00",  "location": "...", "isFollowup": false, "status": "Scheduled",
"comments": "..." }

PUT /admin/bookings/:bookingId/status
Any subset of: { "status", "technician_ID", "booking_date", "time" }
— omitted fields unchanged.Side effects: job+work link guaranteed on assignment; 
double-booking guard:409 This technician already has a booking at that exact date and time...
(customer_ID omitted → creates an ad-hoc customer from customer_name)201:
{ "success": true, "message": "...", "booking_ID": 1014 }

6. Admin — Dashboard — /api/admin/dashboard
Method	         Path	                       Returns
GET     /dashboard/stats	          Aggregates for the admin KPI row
GET	    /dashboard/recent-bookings	Recent bookings for the admin table
GET   	/dashboard/technicians	    Top technicians (by jobsDone/rating)
⚠️ Exact field names: check adminDashboardController.js
(getDashboardStats /getRecentBookings / getTopTechnicians)
 — frontend consumes them inAdminDashboard.jsx today, so it's working as-is.


7. Admin — Users — /api/admin/users

Method	          Path	Purpose
GET	      /users/technicians	          List technicians
POST	    /users/technicians	          Create technician (hashes the password — account can log in immediately)
PUT	      /users/technicians/:id	      Update technician
DELETE	  /users/technicians/:id	      Delete technician
GET	      /users/customers	            List customers
POST	    /users/customers	            Create customer
PUT	      /users/customers/:id	        Update customer
DELETE	  /users/customers/:id	        Delete customer


POST /users/technicians (example)
{ "username": "new_tech", "password": "tech123", "technician_name": "New Tech", "specialty": "General Servicing" }
201: technician profile created (topUser + user3.technician), rating starts at 0.


8. Admin — Inventory — /api/admin/inventory
Method	    Path	                            Purpose
GET	   /admin/inventory	          All items (9 seeded) — used by report materials + Parts Log
POST	 /admin/inventory	          Create item
PUT	   /admin/inventory/:itemId	  Update item
Item shape: { itemID, itemType, itemName, stock, description, isDeleted, SKU,
 reorderAmount, price, stockStatus }


9. Admin — Payables — /api/admin
Method	      Path	          Purpose
GET	   /admin/services	    All services
POST	 /admin/services	    Create service
PUT	   /admin/services/:id	Update service
DELETE /admin/services/:id	Soft-delete service
GET	   /admin/packages	    All packages
POST	 /admin/packages	    Create package
Customer-facing reads use /api/customer/services + /api/customer/promotions
(they filter isdeleted/expired and reshape for the wizard). Admin writes here

10. Legacy /api/bookings

Method     	Path	                           Purpose
GET	   /api/bookings/services	    ⚠️ Legacy — the wizard uses /api/customer/services now
POST	/api/bookings	              ⚠️ Legacy — the wizard uses /api/customer/bookings
Candidate for removal at cleanup — confirm nothing imports them first.

11. Business Rules (enforced server-side — cannot be bypassed)
#	Rule	                                                                    Endpoint	            Rejection
1	🔒 Start gate — no starting before booking date (and time)	         PUT technician status        	400
2	Sequence gate — Complete only from In Progress	                     PUT technician status	        400
3	Report gate — Complete requires a service report (any link style)	   PUT technician status	        400
4	Report timing — reports only while In Progress	                     POST reports  	                400
5	Follow-up auto-booking — flagging creates the return visit	         POST reports	               automatic
6	Rating — Completed only, once, avg → technician_rating               POST rate	                    400
7	Cancel — open bookings only, owner-only	                             PUT cancel	                    400
8	Double-booking — same tech + same date AND time	                     PUT admin status	              409
9	Job-link guarantee — every booking gets job+work rows	admin          POST/PUT, customer POST	    automatic
10	Report→job link — reports stamped onto the booking's job row	     POST reports	                 automatic

Flow implemented by these rules:Scheduled 🔒 → Start (on date) → In Progress → Submit Report →  
Complete → Customer rates → Follow-up visit auto-created if flagged

12. DB Status Values
Pending · Assigned · Scheduled · In Progress · Completed · Cancelled(No "Upcoming" status exists
— UIs map Pending/Assigned/Scheduled to "Upcoming".)

### GET /api/customer/profile?customerId={id}
Returns `{ success, profile: { customer_id, user_id, username, name, email, phone, address, joined, loyalty_points, total_bookings, total_spent } }`

### PUT /api/customer/profile?customerId={id}
Body: `{ name?, email?, phone?, address? }` — all optional, at least one required.
Validates email/phone format; 409 if email belongs to another account.
Returns `{ success, message, profile }` with the updated record.


