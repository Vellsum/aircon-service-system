// backend/resetTechnician.js
const { poolPromise, sql } = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
  try {
    const pool = await poolPromise;
    const plainPassword = 'tech123';
    
    // Generate valid salt and hash using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plainPassword, salt);

    console.log("Generated Hash:", hash);

    const result = await pool.request()
      .input('hash', sql.VarChar(255), hash)
      .input('salt', sql.VarChar(255), salt)
      .query(`
        UPDATE [user3].[topUser]
        SET [hash] = @hash, [salt] = @salt
        WHERE [username] IN ('tech_tan', 'tech_alex')
      `);

    console.log(`Successfully updated ${result.rowsAffected[0]} technician account(s)!`);
    process.exit(0);
  } catch (err) {
    console.error("Error resetting technician password:", err);
    process.exit(1);
  }
}

resetPasswords();