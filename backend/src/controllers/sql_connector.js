
/**
 * this script is by weijie
 * suppose to connect to local sql server once u have sql workbench installed
 
so this is a controller script
*/
// Example: controllers/inventoryController.js
const db = require('../config/db');

// Method to fetch all inventory items
async function getusers(req, res) {
  try {
    // Execute SQL query using the pool
    const [rows] = await db.query('SELECT * FROM user.user');
    
    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error querying database:', error);
    res.status(500).json({ success: false, error: 'Database query failed' });
  }
}

module.exports = { getusers };

//notes to get  database
/**
 * install this -> npm install mysql2
 * 
 * 
 * look at db2.js
 * 
 * look at server2.js
 */