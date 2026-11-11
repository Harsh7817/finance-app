const { errorResponse } = require('../utils/response');

const VALID_PERIOD_TYPES = ['MONTHLY', 'WEEKLY', 'CUSTOM'];

/**
 * Validate budget creation input
 */
const validateBudgetInput = (req, res, next) => {
  const { name, limitAmount, periodType, periodStart, periodEnd, warningThresholdPct } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('name is required');
  }

  if (limitAmount === undefined || isNaN(Number(limitAmount)) || Number(limitAmount) <= 0) {
    errors.push('limitAmount is required and must be greater than zero');
  }

  if (periodType !== undefined && !VALID_PERIOD_TYPES.includes(periodType.toUpperCase())) {
    errors.push(`periodType must be one of: ${VALID_PERIOD_TYPES.join(', ')}`);
  }

  if (periodType && periodType.toUpperCase() === 'CUSTOM') {
    if (!periodStart || !periodEnd) {
      errors.push('periodStart and periodEnd are required when periodType is CUSTOM');
    }
  }

  if (warningThresholdPct !== undefined) {
    const pct = Number(warningThresholdPct);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      errors.push('warningThresholdPct must be an integer between 1 and 100');
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
  validateBudgetInput,
};

