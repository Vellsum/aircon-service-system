// backend/src/controllers/bookingController.js


/**these r controllers
 * the actual methods sticking their dicks into the sql database
 * sql queries r called here
 */


//gg this script was abandoned n nobody bothered to kill the lines


/**
 * 
 * 
 * const { poolPromise, sql } = require('../config/db');
// 1. GET ALL SERVICES & PRICING
exports.getServices = async (req, res) => {
    try {
        const pool = await poolPromise;
        
        // Removed strict isdeleted filter so all active services return cleanly
        const result = await pool.request()
            .query(`
                SELECT service_id, service_name, description, price 
                FROM [payables].[service]
                WHERE isdeleted IS NULL OR isdeleted = 'false' OR isdeleted = '0'
            `);

        res.status(200).json({
            success: true,
            services: result.recordset
        });
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. CREATE NEW BOOKING
exports.createBooking = async (req, res) => {
  
    try {
  console.log("Booking request body:", req.body);
console.log("Estimated cost:", req.body.estimatedTotalCost);
console.log("Estimated time:", req.body.estimatedTotalTime);

console.log("Booking values:", {
    numberOfUnits,
    time,
    comments,
    estimatedtotalcost,
    estimatedtotaltime
});

        //Extract data from the request
        const { customer_ID, //always have this
            //service id? nah we need junction table
            numberOfUnits,
                date, 
                time, 
                location ,
                comments,
                //promocode cannot really, its a frontend calculation thing
                estimatedtotalcost, 
                estimatedtotaltime} = req.body; //these things take name from frontend 

        if (!customer_ID || !date || !time || !location) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide customer_ID, date, time, and location.' 
            });
        }

        const pool = await poolPromise;

        // technician_ID is set to NULL until assigned by Admin
        const result = await pool.request() //prepare the inputs
            .input('customer_ID', sql.Int, customer_ID)
            //no service id here
            .input('numberOfUnits', sql.Int,numberOfUnits) //number of units column
            .input('date', sql.Date, date)
            .input('timing', sql.VarChar(50), time)   //changed to timing table
             .input('location', sql.VarChar(100), location)
             .input('comments',sql.VarChar(500),comments) //new line
             .input('estimateTotalTime_minutes',sql.Int ,estimatedtotaltime) //new cpde
             .input('estimateTotalCost',sql.Float,estimatedtotalcost) //new code
            .input('technician_ID', sql.Int, null) 
            .input('isFollowup', sql.Bit, 0)
            .input('status', sql.VarChar(100), 'Pending')

            //the sql code, these got sorted
            .query(`
                INSERT INTO [new_jobBooking].[Booking] (customer_ID,     
                                                         numberOfUnits,
                                                         date,
                                                          timing,
                                                           location,
                                                           comments,
                                                           estimateTotalTime_minutes,
                                                           estimateTotalCost,
                                                        technician_ID,      
                                                           isFollowup, 
                                                            status)
               
                OUTPUT INSERTED.booking_ID
                VALUES (@customer_ID,
                @numberOfUnits,
                  @date,
                  @timing, 
                    @location,
                    @comments,
                       @estimateTotalTime_minutes,
                    @estimateTotalCost,
                 @technician_ID, 
                  @isFollowup,
                    @status)
            `); //these @ ones refer to the input method on top

        const newBookingId = result.recordset[0].booking_ID;

        res.status(201).json({
            success: true,
            message: 'Booking created successfully!',
            booking_ID: newBookingId
        });

    } catch (err) {
        console.error('Error creating booking:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
 * 
 */
