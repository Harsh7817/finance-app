const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const prisma = require('../config/prisma');

/**
 * Authentication Middleware:
 * Validates the JWT bearer token on protected requests and attaches the user to `req.user`.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, {
        status: 401,
        message: 'Authentication token missing or invalid format. Expected format: Bearer <token>',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, {
          status: 401,
          message: 'Authentication token has expired. Please log in again.',
        });
      }
      return errorResponse(res, {
        status: 401,
        message: 'Invalid authentication token',
      });
    }

    // Ensure user still exists and is ACTIVE in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      return errorResponse(res, {
        status: 401,
        message: 'User account is inactive or no longer exists',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware:
 * Restricts access to users holding one of the allowed roles.
 * Allowed roles: 'END_USER', 'PROJECT_ADMIN', 'AUDITOR'.
 * 
 * @param  {...string} allowedRoles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        status: 401,
        message: 'Authentication required before checking permissions',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, {
        status: 403,
        message: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

/**
 * User Resource Ownership Middleware:
 * Enforces that non-admin users cannot access or modify another user's resources.
 * 
 * @param {string} [paramName='userId'] - The param or query or body key containing the target userId
 */
const enforceOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        status: 401,
        message: 'Authentication required',
      });
    }

    // PROJECT_ADMIN bypasses individual ownership check
    if (req.user.role === 'PROJECT_ADMIN') {
      return next();
    }

    const targetUserId = req.params[paramName] || req.body[paramName] || req.query[paramName];

    if (targetUserId && targetUserId !== req.user.id) {
      return errorResponse(res, {
        status: 403,
        message: 'Forbidden: You do not have permission to access resources belonging to another user',
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  enforceOwnership,
};
