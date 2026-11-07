const jwt = require('jsonwebtoken');
const pool = require('../config/supabaseDb'); // pg Pool (Supabase)

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
    // isDeleted is checked as text so it works whether the column is boolean, int or text
    const result = await pool.query(`
      SELECT nc."customer_ID"
      FROM user3."topUser" u
      JOIN user3."newCustomer" nc ON nc."user_ID" = u."user_ID"
      WHERE u."user_ID" = $1
        AND COALESCE(u."isDeleted"::text, 'false') IN ('0', 'false', 'f')
        AND LOWER(u."accountType") = 'customer'
    `, [claims.id]);
    if (result.rows.length !== 1) {
      return res.status(403).json({ success: false, message: 'An active, unambiguous Customer account is required.' });
    }
    req.ratingCustomer = { userID: claims.id, customerID: result.rows[0].customer_ID };
    return next();
  } catch (err) {
    console.error('[Auth] Customer identity check failed:', err.message);
    return res.status(500).json({ success: false, message: 'Customer identity could not be verified.' });
  }
};