const { errorResponse } = require('../utils/response');

/**
 * 404 Not Found Middleware for handling unmatched routes.
 */
const notFoundHandler = (req, res, next) => {
  return errorResponse(res, {
    status: 404,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Centralized Error Handling Middleware.
 */
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, {
    status,
    message,
    ...(process.env.NODE_ENV !== 'production' && { errors: err.stack }),
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};

