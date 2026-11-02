/* Add genuine booking-rating storage to the existing local/team database.
   No seed data, profile-score backfill, or changes to existing application tables.
   Run separately from setup-all-in-one.sql, which drops/recreates the database.
   Compatible reruns are a no-op. Unrecognized definitions fail for manual review.
   The future API must verify customer ownership and freeze performed-technician attribution;
   these foreign keys alone do not authorize a submission or establish who performed a visit. */
USE [aircon-db];

SET NOCOUNT ON;

IF @@TRANCOUNT <> 0
  THROW 51000, 'Run add-booking-ratings.sql outside an existing transaction.', 1;

SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  -- Serialize concurrent runs of this migration without locking unrelated workflows.
  DECLARE @lockResult INT;
  EXEC @lockResult = sys.sp_getapplock
    @Resource = N'new_jobBooking.bookingRating migration',
    @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
  IF @lockResult < 0
    THROW 51001, 'Could not acquire the bookingRating migration lock; no changes committed.', 1;

  IF SCHEMA_ID(N'new_jobBooking') IS NULL
    OR OBJECT_ID(N'new_jobBooking.Booking', N'U') IS NULL
    OR OBJECT_ID(N'user3.newCustomer', N'U') IS NULL
    OR OBJECT_ID(N'user3.technician', N'U') IS NULL
    THROW 51002, 'Required Booking, newCustomer, or technician table/schema is missing.', 1;

  -- Confirm the source-defined INT primary keys; never modify dependencies to make them fit.
  DECLARE @references TABLE (tableID INT NOT NULL, columnName SYSNAME NOT NULL);
  INSERT INTO @references (tableID, columnName) VALUES
    (OBJECT_ID(N'new_jobBooking.Booking'), N'booking_ID'),
    (OBJECT_ID(N'user3.newCustomer'), N'customer_ID'),
    (OBJECT_ID(N'user3.technician'), N'technician_ID');

  IF EXISTS (
    SELECT 1 FROM @references r
    WHERE NOT EXISTS (
      SELECT 1 FROM sys.columns c
      JOIN sys.index_columns ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      WHERE c.object_id = r.tableID AND c.name = r.columnName
        AND c.user_type_id = TYPE_ID(N'int') AND c.is_nullable = 0
        AND i.is_primary_key = 1 AND i.is_disabled = 0 AND ic.key_ordinal = 1
        AND (SELECT COUNT(*) FROM sys.index_columns k
             WHERE k.object_id = i.object_id AND k.index_id = i.index_id AND k.key_ordinal > 0) = 1
    )
  )
    THROW 51003, 'Required referenced IDs must be single-column INT primary keys.', 1;

  IF OBJECT_ID(N'new_jobBooking.bookingRating') IS NOT NULL
    AND OBJECT_ID(N'new_jobBooking.bookingRating', N'U') IS NULL
    THROW 51004, 'bookingRating already exists as an incompatible non-table object.', 1;

  IF OBJECT_ID(N'new_jobBooking.bookingRating', N'U') IS NULL
  BEGIN
    -- Keep this definition identical to the canonical setup script.
    CREATE TABLE new_jobBooking.bookingRating (
      booking_ID INT NOT NULL,
      customer_ID INT NOT NULL,
      technician_ID INT NOT NULL,
      stars INT NOT NULL,
      submittedAt DATETIME2(7) NOT NULL CONSTRAINT DF_bookingRating_submittedAt DEFAULT (SYSUTCDATETIME()),
      CONSTRAINT PK_bookingRating PRIMARY KEY (booking_ID),
      CONSTRAINT FK_bookingRating_booking FOREIGN KEY (booking_ID) REFERENCES new_jobBooking.Booking(booking_ID),
      CONSTRAINT FK_bookingRating_customer FOREIGN KEY (customer_ID) REFERENCES user3.newCustomer(customer_ID),
      CONSTRAINT FK_bookingRating_technician FOREIGN KEY (technician_ID) REFERENCES user3.technician(technician_ID),
      CONSTRAINT CK_bookingRating_stars CHECK (stars BETWEEN 1 AND 5));
  END;

  -- Validate both newly created tables and existing installations before committing.
  DECLARE @tableID INT = OBJECT_ID(N'new_jobBooking.bookingRating', N'U');
  IF (SELECT COUNT(*) FROM sys.columns WHERE object_id = @tableID) <> 5
    OR EXISTS (
      SELECT 1 FROM sys.columns c WHERE c.object_id = @tableID
      AND (c.is_nullable = 1 OR c.is_identity = 1 OR c.is_computed = 1
        OR NOT (
          (c.name IN (N'booking_ID', N'customer_ID', N'technician_ID', N'stars')
            AND c.user_type_id = TYPE_ID(N'int'))
          OR (c.name = N'submittedAt' AND c.user_type_id = TYPE_ID(N'datetime2') AND c.scale = 7)
        ))
    )
    THROW 51005, 'Incompatible bookingRating columns; expected four required INTs and submittedAt DATETIME2(7).', 1;

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = @tableID AND i.is_primary_key = 1 AND i.is_disabled = 0
      AND c.name = N'booking_ID' AND ic.key_ordinal = 1
      AND (SELECT COUNT(*) FROM sys.index_columns k
           WHERE k.object_id = i.object_id AND k.index_id = i.index_id AND k.key_ordinal > 0) = 1
  )
    OR EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = @tableID AND is_unique = 1 AND is_primary_key = 0)
    THROW 51006, 'Incompatible bookingRating primary key or additional uniqueness constraint.', 1;

  DECLARE @expectedFK TABLE (columnName SYSNAME, referencedTableID INT, referencedColumn SYSNAME);
  INSERT INTO @expectedFK VALUES
    (N'booking_ID', OBJECT_ID(N'new_jobBooking.Booking'), N'booking_ID'),
    (N'customer_ID', OBJECT_ID(N'user3.newCustomer'), N'customer_ID'),
    (N'technician_ID', OBJECT_ID(N'user3.technician'), N'technician_ID');

  IF (SELECT COUNT(*) FROM sys.foreign_keys WHERE parent_object_id = @tableID) <> 3
    OR EXISTS (
      SELECT 1 FROM @expectedFK e WHERE NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fc ON fc.constraint_object_id = fk.object_id
        JOIN sys.columns pc ON pc.object_id = fc.parent_object_id AND pc.column_id = fc.parent_column_id
        JOIN sys.columns rc ON rc.object_id = fc.referenced_object_id AND rc.column_id = fc.referenced_column_id
        WHERE fk.parent_object_id = @tableID AND pc.name = e.columnName
          AND fc.referenced_object_id = e.referencedTableID AND rc.name = e.referencedColumn
          AND fk.is_disabled = 0 AND fk.is_not_trusted = 0
          AND fk.delete_referential_action = 0 AND fk.update_referential_action = 0
          AND fk.is_not_for_replication = 0
          AND (SELECT COUNT(*) FROM sys.foreign_key_columns x WHERE x.constraint_object_id = fk.object_id) = 1
      )
    )
    THROW 51007, 'Incompatible bookingRating foreign keys; expected three trusted, non-cascading references.', 1;

  -- Ignore formatting/constraint names, but require recognizable equivalent definitions.
  DECLARE @starsCheck NVARCHAR(MAX), @utcDefault NVARCHAR(MAX);
  SELECT @starsCheck = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    definition, N'[', N''), N']', N''), N'(', N''), N')', N''), N' ', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N''))
  FROM sys.check_constraints WHERE parent_object_id = @tableID;
  IF (SELECT COUNT(*) FROM sys.check_constraints WHERE parent_object_id = @tableID) <> 1
    OR @starsCheck IS NULL OR @starsCheck NOT IN (N'starsbetween1and5', N'stars>=1andstars<=5')
    OR EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = @tableID
               AND (is_disabled = 1 OR is_not_trusted = 1 OR is_not_for_replication = 1))
    THROW 51008, 'Incompatible bookingRating stars constraint; expected a trusted 1-5 check.', 1;

  SELECT @utcDefault = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    d.definition, N'(', N''), N')', N''), N' ', N''), NCHAR(9), N''), NCHAR(10), N''), NCHAR(13), N''))
  FROM sys.default_constraints d JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
  WHERE d.parent_object_id = @tableID AND c.name = N'submittedAt';
  IF (SELECT COUNT(*) FROM sys.default_constraints WHERE parent_object_id = @tableID) <> 1
    OR @utcDefault IS NULL OR @utcDefault <> N'sysutcdatetime'
    THROW 51009, 'Incompatible bookingRating default; expected SYSUTCDATETIME() on submittedAt only.', 1;

  IF EXISTS (SELECT 1 FROM sys.triggers WHERE parent_id = @tableID AND is_disabled = 0)
    THROW 51010, 'Existing bookingRating triggers require manual compatibility review.', 1;

  COMMIT TRANSACTION;
  PRINT 'bookingRating schema verified; no application data was inserted or updated.';
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
