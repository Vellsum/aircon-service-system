--use to make the table to track recurring subscribers


CREATE TABLE [aircon-db].[payables].[currentSubscribers](

  customerID INT NOT NULL,
  subscriptionid INT NOT NULL,
  remainingBookings INT,
  dateStarted DATE,
  nextBookingDate DATE,

);













--dummy data for above
INSERT INTO [aircon-db].[payables].[currentSubscribers]
 (customerID, subscriptionid, remainingBookings, dateStarted, nextBookingDate)
VALUES 
    (1, 101, 3, '2026-01-15', '2026-02-15'),
    (2, 102, 1, '2026-02-01', '2026-03-01'),
    (3, 101, 5, '2026-03-10', '2026-04-10'),
    (4, 103, 2, '2026-04-05', '2026-05-05'),
    (5, 102, 4, '2026-05-20', '2026-06-20');
