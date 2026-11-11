const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'finance_app_fallback_secret_key_change_in_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT token for an authenticated user.
 * 
 * @param {Object} payload - User identification and role
 * @param {string} payload.userId - User UUID
 * @param {string} payload.email - User email
 * @param {string} payload.role - User role
 * @returns {string} Signed JWT token
 */
const generateToken = ({ userId, email, role }) => {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify a given JWT token.
 * 
 * @param {string} token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
};

