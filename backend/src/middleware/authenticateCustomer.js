const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('../config/db');

// Verify the existing login token, then resolve an active Customer account.
// Neither query-string IDs nor client-provided role/customer fields authorize access.
module.exports = async function authenticateCustomer(req, res, next) {
  const authorization = req.headers.authorization;
  const bearer = typeof authorization === 'string' && /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!bearer) return res.status(401).json({ success: false, message: 'Authentication token missing.' });

  let claims;
  try {
    claims = jwt.verify(bearer[1], process.env.JWT_SECRET || 'coolfix-secret-key', { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(claims.id) || claims.id <= 0 || claims.id > 2147483647
      || !Number.isFinite(claims.exp)) throw new Error('Invalid login identity');
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
  if (String(claims.role).toLowerCase() !== 'customer') {
    return res.status(403).json({ success: false, message: 'A Customer account is required.' });
  }

  try {
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ success: false, message: 'Database offline' });
    const result = await pool.request().input('userId', sql.Int, claims.id).query(`
      SELECT nc.customer_ID
      FROM [user3].[topUser] u
      JOIN [user3].[newCustomer] nc ON nc.user_ID = u.user_ID
      WHERE u.user_ID = @userId AND u.isDeleted = 0 AND LOWER(u.accountType) = 'customer'
    `);
    if (result.recordset.length !== 1) {
      return res.status(403).json({ success: false, message: 'An active, unambiguous Customer account is required.' });
    }
    req.ratingCustomer = { userID: claims.id, customerID: result.recordset[0].customer_ID };
    return next();
  } catch {
    return res.status(500).json({ success: false, message: 'Customer identity could not be verified.' });
  }
};
