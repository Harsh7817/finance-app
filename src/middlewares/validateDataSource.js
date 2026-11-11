const { errorResponse } = require('../utils/response');
const { VALID_SOURCE_TYPES, VALID_ACCOUNT_TYPES } = require('../services/dataSourceService');

/**
 * Validate input when registering a new data source
 */
const validateDataSourceInput = (req, res, next) => {
  const { sourceType, providerName, accountType } = req.body;
  const errors = [];

  if (!sourceType || !VALID_SOURCE_TYPES.includes(sourceType)) {
    errors.push(`sourceType is required and must be one of: ${VALID_SOURCE_TYPES.join(', ')}`);
  }

  if (!providerName || typeof providerName !== 'string' || !providerName.trim()) {
    errors.push('providerName is required (e.g., "HDFC Bank", "SBI", "Android SMS Service")');
  }

  if (accountType !== undefined && !VALID_ACCOUNT_TYPES.includes(accountType)) {
    errors.push(`accountType must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}`);
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

/**
 * Validate optional manual financial account input
 */
const validateFinancialAccountInput = (req, res, next) => {
  const { accountName, institutionName, accountType, openingBalance } = req.body;
  const errors = [];

  if (!accountName || typeof accountName !== 'string' || !accountName.trim()) {
    errors.push('accountName is required');
  }

  if (!institutionName || typeof institutionName !== 'string' || !institutionName.trim()) {
    errors.push('institutionName is required (e.g. "HDFC Bank", "Cash Wallet")');
  }

  if (accountType !== undefined && !VALID_ACCOUNT_TYPES.includes(accountType)) {
    errors.push(`accountType must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}`);
  }

  if (openingBalance !== undefined) {
    if (isNaN(Number(openingBalance))) {
      errors.push('openingBalance must be a valid number');
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
  validateDataSourceInput,
  validateFinancialAccountInput,
};

