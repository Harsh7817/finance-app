const { errorResponse } = require('../utils/response');

/**
 * Validate goal creation input
 */
const validateGoalInput = (req, res, next) => {
  const { name, targetAmount, targetDate, priority, initialContribution } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('name is required');
  }

  if (targetAmount === undefined || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) {
    errors.push('targetAmount is required and must be greater than zero');
  }

  if (!targetDate) {
    errors.push('targetDate is required (future date)');
  } else {
    const d = new Date(targetDate);
    if (isNaN(d.getTime()) || d <= new Date()) {
      errors.push('targetDate must be a valid future ISO-8601 date string');
    }
  }

  if (priority !== undefined && (isNaN(parseInt(priority, 10)) || parseInt(priority, 10) < 1)) {
    errors.push('priority must be a positive integer');
  }

  if (initialContribution !== undefined && (isNaN(Number(initialContribution)) || Number(initialContribution) < 0)) {
    errors.push('initialContribution must be a non-negative number');
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
 * Validate goal contribution input
 */
const validateContributionInput = (req, res, next) => {
  const { amount, contributionType } = req.body;
  const errors = [];

  if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push('amount is required and must be greater than zero');
  }

  const VALID_TYPES = ['ALLOCATION', 'TRANSACTION_LINKED', 'INTEREST', 'WITHDRAWAL'];
  if (contributionType && !VALID_TYPES.includes(contributionType.toUpperCase())) {
    errors.push(`contributionType must be one of: ${VALID_TYPES.join(', ')}`);
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
  validateGoalInput,
  validateContributionInput,
};

