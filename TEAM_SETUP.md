
🛠 Team Setup — AirCon Care (Local Dev Environment)
Read this once, follow it top to bottom. Total time: ~25 minutes.We develop against a local SQL Server so we never touch the Azure credit.Azure is only used for final deployment.

1. Prerequisites — install once per machine
Tool	Link	Notes
SQL Server 2022 Express	https://www.microsoft.com/en-us/download/details.aspx?id=104781	Choose Basic install. Note the instance name (default: SQLEXPRESS)
Node.js 18+	https://nodejs.org	You probably have it
SSMS (optional)	https://aka.ms/ssms	Only if you want to browse tables. Everything else works without it
2. Database setup (~5 min)
Open SSMS (or skip SSMS and use the sqlcmd command shown below)
Connect to localhost\SQLEXPRESS with Windows Authentication
Check your instance name in services.msc — look for "SQL Server (SQLEXPRESS)"
File → Open → File… → select backend/database/setup-all-in-one.sql
Click Execute (F5)
✅ You should see: DONE: [aircon-db] created with schemas + demo data. with no red errors
⚠️ STOP the backend first if it's running (Ctrl+C in its terminal).Its connection pool locks the database and the script will fail with a"single user" error. Restart the backend after the script finishes.

Command-line alternative (no SSMS needed):

sqlcmd -S localhost\SQLEXPRESS -E -i "C:\path\to\aircon-service-system\backend\database\setup-all-in-one.sql"
3. Backend setup
cd backendcopy .env.example .envnpm installnpm start
✅ You should see:

[DB] Connected to aircon-dbCool Fix backend active on http://localhost:5000
Quick check — open in a browser:

http://localhost:5000/api/customer/services
→ JSON with 5 services = database + backend are working.

4. Frontend setup
cd frontendnpm installnpm run dev
Open the URL it prints (usually http://localhost:5173).

5. Test logins (all pre-seeded)
Role	Username	Password	Lands on
Customer	scott	customer123	/customer/dashboard
Admin	admin_sarah	admin123	/admin/dashboard
Technician	tech_chen	tech123	/technician/dashboard
Technician	tech_raj	tech123	/technician/dashboard
Technician	tech_alex	tech123	/technician/dashboard
Admin can create more technicians/customers through the admin UI —those accounts work immediately (passwords are hashed on creation).

6. Demo data in the seed
5 services (General Servicing, Chemical Wash, Chemical Overhaul, Gas Top-Up…)
2 promotions: WELCOME10 ($10 off), COOL15 (15% off) — try them in the booking wizard
Bookings: completed ones (with service reports), one assigned for today, one scheduled in the future (shows the 🔒 lock on the technician side)
Aircon units for several customers — visible in the booking wizard and My Units
7. The two rules that save you an hour of debugging
⚠️ ALWAYS stop the backend before re-running the setup script. The backend's connection pool locks the DB in single-user mode and the script fails with confusing errors. Ctrl+C → run script → npm start.
Re-running the setup script RESETS the database to the seed. Bookings/units/accounts you created through the app are wiped. That's intentional — it's the dev reset button.
8. When the schema changes (workflow)
Backend code that needs a new table/column must come with an update to backend/database/setup-all-in-one.sql in the same commit.
Schema owner: Wei Jie — but anyone can propose the change.
When the script changes: announce in the group → everyone does: git pull → stop backend → re-run script → restart backend.
9. Troubleshooting (errors we actually hit)
Error	Cause → Fix
SSMS: "error 26 — Error Locating Server/Instance"	Wrong instance name or SQL Server Browser stopped → check services.msc for the real name; set SQL Server Browser to Automatic + Start
Login failed for user 'sa'	Mixed-mode auth not enabled → SSMS: server Properties → Security → SQL Server and Windows Authentication mode; enable sa (Security → Logins → sa → Status → Enabled, set password); restart the SQL service
Backend: "self-signed certificate"	.env wrong → make sure DB_ENCRYPT=false and DB_TRUST_SERVER_CERTIFICATE=true (copy .env.example exactly)
Backend: connection timeout / instance not found	TCP/IP disabled → SQL Server 2022 Configuration Manager → Protocols for SQLEXPRESS → enable TCP/IP → restart the SQL service
Invalid object name 'user3.topUser' (or similar)	Script didn't finish → re-run it and watch for the first red error; fix that one
"Database is already open and can only have one user at a time"	Backend is running → Ctrl+C it, then run: sqlcmd -S localhost\SQLEXPRESS -E -Q "ALTER DATABASE [aircon-db] SET MULTI_USER;" and retry the script
Login fails for a seeded user	Your DB is older than the script → re-run the (current) script with backend stopped
Everything 500s after a git pull	Schema changed → re-run the setup script (rule #2 applies)
10. Azure — leave it alone
The Azure subscription has a spending limit; every resource we touch burns credit. Do not connect to it, do not run scripts against it, do not point your .env at it.
Final deployment (one week before demo): export this same script to the Azure SQL free-tier DB, flip .env to Azure values (DB_ENCRYPT=true, Azure server/user/password), deploy. The schema is identical by design — that's the whole point of this setup.
11. Quick daily workflow
# starting work each day
git pullcd backend  && npm start      
# terminal 1
cd frontend && npm run dev    
# terminal 2
# finished for the day
git add -Agit commit -m "what you did"
git push origin your-branch
Last updated: 6 Oct 2026 — if this file is wrong, fix it and commit.

| Login fails for admin_sarah / tech_* ("Invalid username or password") | DB was built from an older script with placeholder hashes → quick fix: POST to /api/auth/reset-password for each account (see README section 5 for passwords); permanent: pull the latest setup-all-in-one.sql and re-run |
