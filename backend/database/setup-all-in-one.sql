/* AirCon Care — LOCAL DEV DATABASE (single DB + schemas, matches backend queries)
   Re-runnable: drops and rebuilds everything. */
USE master;
GO
IF DB_ID(N'aircon-db') IS NOT NULL
BEGIN
  ALTER DATABASE [aircon-db] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
  DROP DATABASE [aircon-db];
END;
GO
CREATE DATABASE [aircon-db];
GO
USE [aircon-db];
GO
CREATE SCHEMA user3; 
GO
CREATE SCHEMA new_jobBooking;
GO
CREATE SCHEMA inventory;
GO
CREATE SCHEMA payables;
GO

/* ============ user3 ============ */
CREATE TABLE user3.topUser (
  user_ID INT IDENTITY PRIMARY KEY, username VARCHAR(100) NOT NULL,
  salt VARCHAR(255) NULL, hash VARCHAR(255) NULL, accountType VARCHAR(100) NOT NULL,
  isDeleted BIT NOT NULL DEFAULT 0, phoneNumber VARCHAR(50) NULL,
  email VARCHAR(100) NULL, joined DATE NULL);

CREATE TABLE user3.newCustomer (
  customer_ID INT IDENTITY PRIMARY KEY, customer_name VARCHAR(100) NOT NULL,
  customer_aircons INT NOT NULL DEFAULT 0, loyaltyPoints INT NOT NULL DEFAULT 0,
  customer_address VARCHAR(200) NOT NULL, bought_packages INT NOT NULL DEFAULT 0,
  user_ID INT NOT NULL, totalBookings INT NULL, totalSpent FLOAT NULL,
  CONSTRAINT FK_nc_user FOREIGN KEY (user_ID) REFERENCES user3.topUser(user_ID));

CREATE TABLE user3.technician (
  technician_ID INT IDENTITY PRIMARY KEY, technician_name VARCHAR(100) NOT NULL,
  technician_rating INT NOT NULL DEFAULT 5, user_ID INT NOT NULL,
  specialty VARCHAR(100) NULL, jobsDone INT NULL,
  CONSTRAINT FK_tech_user FOREIGN KEY (user_ID) REFERENCES user3.topUser(user_ID));

CREATE TABLE user3.admin (
  admin_id INT IDENTITY PRIMARY KEY, admin_name VARCHAR(100) NOT NULL,
  authorityKey INT NOT NULL DEFAULT 0, user_ID INT NOT NULL,
  CONSTRAINT FK_admin_user FOREIGN KEY (user_ID) REFERENCES user3.topUser(user_ID));

CREATE TABLE user3.jobHistory (historyID INT IDENTITY PRIMARY KEY, technician_ID INT NULL, job_ID INT NULL);
CREATE TABLE user3.serviceHistory (historyID INT IDENTITY PRIMARY KEY, customerid INT NULL, bookingid INT NULL);
GO

/* ============ payables ============ */
CREATE TABLE payables.service (
  service_id INT IDENTITY PRIMARY KEY, service_name VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL, price FLOAT NOT NULL DEFAULT 0,
  duration VARCHAR(100) NULL, service_type VARCHAR(100) NULL,
  isdeleted BIT NOT NULL DEFAULT 0);

CREATE TABLE payables.promotions (
  promo_id INT IDENTITY PRIMARY KEY, promo_name VARCHAR(255) NULL,
  promo_start DATE NULL, promo_end DATE NULL, description VARCHAR(255) NULL,
  promoCode VARCHAR(255) NULL, isdeleted VARCHAR(20) DEFAULT 'false',
  discount FLOAT NULL, used VARCHAR(100) NULL,
  serviceList INT NULL, packageList INT NULL);

CREATE TABLE payables.serviceList (packageID INT NOT NULL, promoID INT NOT NULL, serviceID INT NOT NULL, PRIMARY KEY (packageID, promoID, serviceID));
CREATE TABLE payables.packageList (promoID INT NOT NULL, packageID INT NOT NULL, serviceID INT NOT NULL, PRIMARY KEY (promoID, packageID, serviceID));
CREATE TABLE payables.purchases (purchase_id INT IDENTITY PRIMARY KEY, customerID INT NULL, promoID INT NULL, packageID INT NULL, serviceID INT NULL);
GO

/* ============ inventory ============ */
CREATE TABLE inventory.inventoryItem (
  itemID INT IDENTITY PRIMARY KEY, itemType VARCHAR(100) NULL, itemName VARCHAR(100) NULL,
  stock INT NULL, description VARCHAR(255) NULL, isDeleted BIT DEFAULT 0,
  SKU VARCHAR(100) NULL, reorderAmount INT NULL, price FLOAT NULL, stockStatus VARCHAR(100) NULL);

CREATE TABLE inventory.aircon (
  aircon_ID INT IDENTITY PRIMARY KEY, itemID INT NULL,
  aircon_model VARCHAR(100) NULL, aircon_make VARCHAR(100) NULL,
  aircon_type VARCHAR(100) NULL, aircon_serialNumber VARCHAR(100) NULL,
  aircon_warrantyNumber VARCHAR(100) NULL, isInstalled BIT DEFAULT 0);

CREATE TABLE inventory.airconPart (airconpart_id INT IDENTITY PRIMARY KEY, itemID INT NULL, compatibleAircon INT NULL);
CREATE TABLE inventory.installedAircons (
  airconID INT NOT NULL, customerID INT NOT NULL, PRIMARY KEY (airconID, customerID),
  CONSTRAINT FK_ia_aircon FOREIGN KEY (airconID) REFERENCES inventory.aircon(aircon_ID),
  CONSTRAINT FK_ia_customer FOREIGN KEY (customerID) REFERENCES user3.newCustomer(customer_ID));
CREATE TABLE inventory.partCompatibility (airconID INT NOT NULL, airconPartID INT NOT NULL, PRIMARY KEY (airconID, airconPartID));
CREATE TABLE inventory.disposableTools (part_id INT PRIMARY KEY, itemID INT NULL);
CREATE TABLE inventory.tools (part_id INT PRIMARY KEY, itemID INT NULL, availability VARCHAR(50) NULL);
GO

/* ============ new_jobBooking ============ */
CREATE TABLE new_jobBooking.serviceReport (
  reportID INT IDENTITY PRIMARY KEY, description VARCHAR(500) NULL,
  technicianID INT NOT NULL, isFollowup BIT DEFAULT 0,
  findings VARCHAR(300) NULL, actionsTaken VARCHAR(300) NULL,
  AC_condition VARCHAR(200) NULL, recommendations VARCHAR(200) NULL,
  notes VARCHAR(200) NULL, serviceChecklist VARCHAR(500) NULL,
  completedDateTime DATETIME2 NULL,
  CONSTRAINT FK_sr_tech FOREIGN KEY (technicianID) REFERENCES user3.technician(technician_ID));

CREATE TABLE new_jobBooking.job (
  job_ID INT IDENTITY PRIMARY KEY, job_status VARCHAR(100) NOT NULL,
  isFollowup BIT DEFAULT 0, serviceReport INT NULL, serviceID INT NOT NULL,
  CONSTRAINT FK_job_sr FOREIGN KEY (serviceReport) REFERENCES new_jobBooking.serviceReport(reportID),
  CONSTRAINT FK_job_svc FOREIGN KEY (serviceID) REFERENCES payables.service(service_id));

CREATE TABLE new_jobBooking.Booking (
  booking_ID INT IDENTITY PRIMARY KEY, customer_ID INT NOT NULL, technician_ID INT NULL,
  [date] DATE NOT NULL, [time] TIME NOT NULL, isFollowup BIT DEFAULT 0,
  location VARCHAR(100) NOT NULL, [status] VARCHAR(100) NOT NULL, comments VARCHAR(500) NULL,
  CONSTRAINT FK_bk_customer FOREIGN KEY (customer_ID) REFERENCES user3.newCustomer(customer_ID),
  CONSTRAINT FK_bk_tech FOREIGN KEY (technician_ID) REFERENCES user3.technician(technician_ID));

CREATE TABLE new_jobBooking.partsUsed (reportID INT NOT NULL, itemID INT NOT NULL, PRIMARY KEY (reportID, itemID));
CREATE TABLE new_jobBooking.work (job_ID INT NOT NULL, booking_ID INT NOT NULL, PRIMARY KEY (job_ID, booking_ID),
  CONSTRAINT FK_w_job FOREIGN KEY (job_ID) REFERENCES new_jobBooking.job(job_ID),
  CONSTRAINT FK_w_booking FOREIGN KEY (booking_ID) REFERENCES new_jobBooking.Booking(booking_ID));
GO

/* ==================== SEED DATA (Wei Jie's, adapted) ==================== */
SET IDENTITY_INSERT user3.topUser ON;
INSERT INTO user3.topUser (user_ID, username, salt, hash, accountType, isDeleted, phoneNumber, email, joined) VALUES
(1,'admin_sarah','salt_123_abc','hash_pwd_admin1','Admin',0,'+6591234567','sarah.admin@airconcool.com','2024-01-15'),
(2,'tech_chen','salt_456_def','hash_pwd_tech1','Technician',0,'+6592345678','chen.wei@airconcool.com','2024-02-01'),
(3,'tech_raj','salt_789_ghi','hash_pwd_tech2','Technician',0,'+6593456789','raj.kumar@airconcool.com','2024-03-10'),
(4,'tech_alex','salt_101_jkl','hash_pwd_tech3','Technician',0,'+6594567890','alex.tan@airconcool.com','2024-05-20'),
(5,'cust_john','salt_202_mno','hash_pwd_cust1','Customer',0,'+6595678901','john.doe@gmail.com','2024-06-01'),
(6,'cust_mary','salt_303_pqr','hash_pwd_cust2','Customer',0,'+6596789012','mary.lim@yahoo.com','2024-06-15'),
(7,'cust_david','salt_404_stu','hash_pwd_cust3','Customer',0,'+6597890123','david.wong@outlook.com','2024-07-02'),
(8,'cust_elena','salt_505_vwx','hash_pwd_cust4','Customer',0,'+6598901234','elena.rodriguez@gmail.com','2024-08-10'),
(9,'scott','$2b$10$nf5BZ.T/IASMv.vNEMGlaO','$2b$10$nf5BZ.T/IASMv.vNEMGlaOoeJvdEZM3f2ysNFdEJ8txdp3JjdxeuS','Customer',0,'+6591112222','khar.sum@example.com','2026-01-05');
SET IDENTITY_INSERT user3.topUser OFF;

SET IDENTITY_INSERT user3.newCustomer ON;
INSERT INTO user3.newCustomer (customer_ID, customer_name, loyaltyPoints, customer_address, user_ID, totalBookings, totalSpent, bought_packages, customer_aircons) VALUES
(201,'John Doe',150,'Blk 123 Ang Mo Kio Ave 3 #08-45, Singapore 560123',5,3,450,1,1),
(202,'Mary Lim',80,'Blk 456 Jurong West St 42 #12-101, Singapore 640456',6,2,220,0,1),
(203,'David Wong',300,'15 Orchard Road #04-12, Singapore 238840',7,5,890,2,1),
(204,'Elena Rodriguez',50,'Blk 789 Tampines Ave 5 #02-18, Singapore 520789',8,1,130,0,0),
(205,'Scott Sum',4,'123 Bukit Timah Road',9,3,380,0,2);
SET IDENTITY_INSERT user3.newCustomer OFF;

SET IDENTITY_INSERT user3.technician ON;
INSERT INTO user3.technician (technician_ID, technician_name, technician_rating, user_ID, specialty, jobsDone) VALUES
(101,'Chen Wei',5,2,'Chemical Overhaul & VRV Systems',142),
(102,'Raj Kumar',4,3,'Gas Top-up & Leakage Repairs',98),
(103,'Alex Tan',5,4,'General Servicing & Compressor Replacement',65);
SET IDENTITY_INSERT user3.technician OFF;

SET IDENTITY_INSERT user3.admin ON;
INSERT INTO user3.admin (admin_id, admin_name, authorityKey, user_ID) VALUES (1,'Sarah Jenkins',99,1);
SET IDENTITY_INSERT user3.admin OFF;

INSERT INTO user3.jobHistory (technician_ID, job_ID) VALUES (101,5001),(102,5002),(103,5003),(101,5004);
INSERT INTO user3.serviceHistory (customerid, bookingid) VALUES (201,1001),(202,1002),(203,1003),(204,1004),(205,1005);

SET IDENTITY_INSERT payables.service ON;
INSERT INTO payables.service (service_id, service_name, description, price, duration, service_type) VALUES
(10,'General Servicing (1 Unit)','Standard filter cleaning & inspection',40.00,'30 mins','Maintenance'),
(11,'General Servicing (3 Units)','Multi-room wall mounted package',100.00,'60 mins','Maintenance'),
(12,'Chemical Wash (1 Unit)','Deep cleaning for heavy choked fan coil',90.00,'60 mins','Deep Clean'),
(13,'Chemical Overhaul (1 Unit)','Full dismantling & chemical bath',150.00,'90 mins','Deep Clean'),
(14,'Gas Top-Up (R410A/R32)','Refrigerant pressure check & refill',60.00,'30 mins','Repair');
SET IDENTITY_INSERT payables.service OFF;

/* discount < 1 = percent fraction; >= 1 = fixed dollars */
SET IDENTITY_INSERT payables.promotions ON;
INSERT INTO payables.promotions (promo_id, promo_name, promo_start, promo_end, description, promoCode, isdeleted, discount) VALUES
(101,'Year End Cooling Deal','2026-10-01','2026-12-31','15% off all Chemical Overhauls','COOL15','false',0.15),
(102,'New Customer Discount','2026-01-01','2026-12-31','$10 off first servicing job','WELCOME10','false',10.00);
SET IDENTITY_INSERT payables.promotions OFF;

INSERT INTO payables.purchases (customerID, promoID, serviceID) VALUES (201,102,11),(202,NULL,12),(203,101,13);

SET IDENTITY_INSERT inventory.inventoryItem ON;
INSERT INTO inventory.inventoryItem (itemID, itemType, itemName, stock, description, isDeleted, SKU, reorderAmount, price, stockStatus) VALUES
(301,'Aircon Unit','Daikin Smile Series 12000 BTU',12,'Inverter Wall Mounted System 1',0,'DK-SMILE-12K',5,850.00,'In Stock'),
(302,'Aircon Unit','Mitsubishi Starmex 18000 BTU',8,'5-Ticks Inverter Split System',0,'MIT-STAR-18K',3,1150.00,'In Stock'),
(303,'Aircon Unit','Panasonic Premium Inverter 9000 BTU',15,'Nanoe-X Air Purifying Tech',0,'PAN-NANO-09K',5,720.00,'In Stock'),
(304,'Spare Part','R410A Refrigerant Gas Canister 11.3kg',25,'Standard Eco-friendly Gas Tank',0,'GAS-R410A-11KG',8,140.00,'In Stock'),
(305,'Spare Part','R32 Refrigerant Gas Canister 10kg',30,'High Efficiency Gas Tank',0,'GAS-R32-10KG',10,160.00,'In Stock'),
(306,'Spare Part','Universal Aircon Water Drain Hose (10m)',45,'Flexible PVC Condensate Hose',0,'ACC-HOSE-10M',15,18.50,'In Stock'),
(307,'Spare Part','Fan Motor - Daikin Compatible',6,'DC Fan Motor for Inverter FCU',0,'MOT-DK-INVERT',3,125.00,'Low Stock'),
(308,'Tool','R32/R410A Digital Manifold Gauge Set',5,'HVAC Testing & Charging Gauge',0,'TL-GAUGE-DIGI',2,210.00,'In Stock'),
(309,'Disposable Tool','Chemical Wash Protection Bag Set',120,'Heavy Duty Waterproof Cleaning Cover',0,'DSP-CHEM-BAG',30,4.50,'In Stock');
SET IDENTITY_INSERT inventory.inventoryItem OFF;

SET IDENTITY_INSERT inventory.aircon ON;
INSERT INTO inventory.aircon (aircon_ID, itemID, aircon_model, aircon_make, aircon_type, aircon_serialNumber, isInstalled) VALUES
(401,301,'FTKM35P','Daikin','Wall Mounted','DK20240811001',1),
(402,302,'MSXY-FN18VE','Mitsubishi','Wall Mounted','MIT20240722045',1),
(403,303,'CS-PU9WKZ','Panasonic','Wall Mounted','PAN20240901089',1),
(404,301,'FTKM25','Daikin','Wall Mounted','DK20250101001',1),
(405,302,'MSZ-GL12','Mitsubishi','Wall Mounted','MIT20250101002',1);
SET IDENTITY_INSERT inventory.aircon OFF;

INSERT INTO inventory.airconPart (airconpart_id, itemID, compatibleAircon) VALUES (501,307,401),(502,306,402);
INSERT INTO inventory.installedAircons (airconID, customerID) VALUES (401,201),(402,202),(403,203),(404,205),(405,205);
INSERT INTO inventory.partCompatibility (airconID, airconPartID) VALUES (401,501),(402,502);
INSERT INTO inventory.disposableTools (part_id, itemID) VALUES (601,309);
INSERT INTO inventory.tools (part_id, itemID, availability) VALUES (701,308,'Assigned to Chen Wei');

SET IDENTITY_INSERT new_jobBooking.serviceReport ON;
INSERT INTO new_jobBooking.serviceReport (reportID, description, technicianID, isFollowup, findings, actionsTaken, AC_condition, recommendations, notes, serviceChecklist, completedDateTime) VALUES
(8001,'General servicing for 3 wall units',101,0,'Filters dirty, gas pressure normal','Cleaned filters, washed coils, tested airflow','Good','Recommend chemical wash in 6 months','Customer satisfied','Filters: OK | Gas: OK | Drainage: Clear','2026-09-20 10:45:00'),
(8002,'Water leakage repair & chemical wash',102,0,'Drain pipe choked with jelly build-up','Flushed drain pipe with vacuum, chemical wash on fancoil','Fair','Keep room temperature at 24C','Cleared choke completely','Drainage: Fixed | Cleaned: Yes','2026-09-22 15:30:00'),
(8003,'Full chemical overhaul',101,0,'Heavy dust build-up behind blower wheel','Dismantled unit, chemical bath wash, topped up R32 gas','Excellent','Regular 4-month servicing','Unit cooling back to optimal efficiency','Dismantled: Yes | Gas Added: 15 PSI','2026-09-25 13:00:00'),
(8004,'General servicing master bedroom',101,0,'Moderate dust on filters','Cleaned filters and coils, checked gas pressure','Good','Next service in 3 months','No issues found','Filters: OK | Gas: OK',DATEADD(DAY,-40,GETDATE()));
SET IDENTITY_INSERT new_jobBooking.serviceReport OFF;

SET IDENTITY_INSERT new_jobBooking.job ON;
INSERT INTO new_jobBooking.job (job_ID, job_status, isFollowup, serviceReport, serviceID) VALUES
(5001,'Finished',0,8001,11),(5002,'Finished',0,8002,12),(5003,'Finished',0,8003,13),
(5004,'Assigned',0,NULL,10),(5005,'Finished',0,8004,10),
(5006,'Pending',0,NULL,12),(5007,'Assigned',0,NULL,11);
SET IDENTITY_INSERT new_jobBooking.job OFF;

SET IDENTITY_INSERT new_jobBooking.Booking ON;
INSERT INTO new_jobBooking.Booking (booking_ID, customer_ID, technician_ID, [date], [time], isFollowup, location, [status], comments) VALUES
(1001,201,101,'2026-09-20','09:30:00',0,'Blk 123 Ang Mo Kio Ave 3 #08-45','Completed','Master bedroom aircon not cold'),
(1002,202,102,'2026-09-22','14:00:00',0,'Blk 456 Jurong West St 42 #12-101','Completed','Water leaking from living room unit'),
(1003,203,101,'2026-09-25','11:00:00',0,'15 Orchard Road #04-12','Completed','Yearly maintenance and gas check'),
(1004,204,103,DATEADD(DAY,5,GETDATE()),'15:30:00',0,'Blk 789 Tampines Ave 5 #02-18','Scheduled','Squeaking noise when fan operates'),
(1005,205,101,DATEADD(DAY,-40,GETDATE()),'09:00:00',0,'123 Bukit Timah Road','Completed','Regular servicing.'),
(1006,205,NULL,DATEADD(DAY,7,GETDATE()),'11:00:00',0,'123 Bukit Timah Road','Pending','Unit not cold at night.'),
(1007,205,102,DATEADD(DAY,2,GETDATE()),'14:00:00',0,'123 Bukit Timah Road','Assigned','Chemical wash for second unit.');
SET IDENTITY_INSERT new_jobBooking.Booking OFF;

INSERT INTO new_jobBooking.partsUsed (reportID, itemID) VALUES (8002,306),(8003,305),(8003,309);
INSERT INTO new_jobBooking.work (job_ID, booking_ID) VALUES (5001,1001),(5002,1002),(5003,1003),(5004,1004),(5005,1005),(5006,1006),(5007,1007);
GO
PRINT 'DONE: [aircon-db] created with schemas + demo data.';