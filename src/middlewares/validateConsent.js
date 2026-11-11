const { errorResponse } = require('../utils/response');

/**
 * Middleware to validate consent creation.
 */
const validateConsentInput = (req, res, next) => {
  const { purpose, scope, consentVersion, expiresAt } = req.body;
  const errors = [];

  if (!purpose || typeof purpose !== 'string' || !purpose.trim()) {
    errors.push('Purpose is required (e.g. SMS_PARSING, BANK_STATEMENT_PROCESSING)');
  }

  if (!scope || typeof scope !== 'string' || !scope.trim()) {
    errors.push('Scope is required (e.g. READ_TRANSACTIONS)');
  }

  if (consentVersion !== undefined && typeof consentVersion !== 'string') {
    errors.push('consentVersion must be a string');
  }

  if (expiresAt !== undefined) {
    const parsedDate = new Date(expiresAt);
    if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
      errors.push('expiresAt must be a valid future ISO-8601 date string');
    }
  }

  if (errors.length > 0) {
    return errorResponse(res, {
      status: 400,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

module.exports = {
  validateConsentInput,
};

