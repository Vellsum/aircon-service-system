-- weijie here, run this to make new table + dummy data

--USE [aircon-db];
--GO

-- Create schema if it doesn't exist (following your naming convention like payables, inventory, etc.)
-- Or you can place it under an existing schema like [payables] or [dbo]. 
-- Here we'll use a schema name matching your pattern, e.g., [payables] or [dbo]. Let's use [payables] since purchases is there.

CREATE TABLE [aircon-db].[payables].[subscription] (
    [subscriptionID]     INT IDENTITY(1,1) NOT NULL,
    [name]               VARCHAR(255) NULL,
    [description]        VARCHAR(MAX) NULL,
    [recurringServiceID] INT NULL,       -- this is the standard service that gets repeated, take from the services we alr have
    [timeTillNextService] INT NULL,       -- Representing interval/days/months till next service booking. lets do it in days
    [numberOfBookings]   INT NULL,       -- Total number of bookings included in this subscription cycle

    CONSTRAINT [PK_payables_subscription] PRIMARY KEY CLUSTERED ([subscriptionID] ASC),
    
    -- Optional Foreign Key constraint linking to your service list table 
    -- (Adjust table name if your service list table differs, e.g., payables.serviceList or payables.service)
    CONSTRAINT [FK_subscription_recurringService] FOREIGN KEY ([recurringServiceID])
        REFERENCES [payables].[service] ([service_id]) -- Update reference table if needed based on your schema
        ON DELETE SET NULL
);
GO



--//dummy data==================================
--do note that the value for recurringServiceID is the pk of the service

USE [aircon-db];
GO

-- Insert dummy subscription plans matching your columns and nullability
INSERT INTO [payables].[subscription] 
    ([name], [description], [recurringServiceID], [timeTillNextService], [numberOfBookings])
VALUES 
    (
        'Quarterly Aircon Care Plan', 
        'Covers routine chemical flushing and standard maintenance every 3 months for up to 3 units. Includes priority scheduling.', 
        10,   -- Assuming serviceID 1 is standard general servicing
        90,  -- 90 days till next service
        4    -- 4 total bookings per year
    ),
    (
        'Bi-Monthly Intensive Maintenance Shield', 
        'Designed for heavy-usage environments and homes with pets. Servicing scheduled every 2 months.', 
        11,   -- Assuming serviceID 2 is chemical wash / intensive servicing
        60,  -- 60 days till next service
        6    -- 6 total bookings per year
    ),
    (
        'Half-Yearly Seasonal Checkup', 
        'Light maintenance plan for secondary rooms or low-usage units, scheduled every 6 months.', 
        12,   -- Standard service
        180, -- 180 days till next service
        2    -- 2 total bookings per year
    );
GO

-- Verify the inserted data
SELECT * FROM [payables].[subscription];
GO