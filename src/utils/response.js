/**
 * Standard API Response utilities for consistent JSON output across all endpoints.
 */

const successResponse = (res, { status = 200, message = 'Success', data = null, meta = null } = {}) => {
  const payload = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(meta !== null && { meta }),
  };
  return res.status(status).json(payload);
};

const errorResponse = (res, { status = 500, message = 'An unexpected error occurred', errors = null } = {}) => {
  const payload = {
    success: false,
    message,
    ...(errors !== null && { errors }),
  };
  return res.status(status).json(payload);
};

module.exports = {
  successResponse,
  errorResponse,
};

