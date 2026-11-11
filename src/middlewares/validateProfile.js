const { errorResponse } = require('../utils/response');

/**
 * Middleware to validate profile update request body.
 */
const validateProfileUpdateInput = (req, res, next) => {
  const {
    baseCurrency,
    monthlyStatedIncome,
    savingsTargetPercentage,
    riskTolerance,
    notificationPreferences,
  } = req.body;

  const errors = [];

  // Must provide at least one field to update
  const providedFields = [
    baseCurrency,
    monthlyStatedIncome,
    savingsTargetPercentage,
    riskTolerance,
    notificationPreferences,
  ].filter((field) => field !== undefined);

  if (providedFields.length === 0) {
    return errorResponse(res, {
      status: 400,
      message: 'Validation failed',
      errors: ['At least one profile field must be provided for update'],
    });
  }

  // Validate baseCurrency
  if (baseCurrency !== undefined) {
    if (typeof baseCurrency !== 'string' || baseCurrency.trim().length !== 3) {
      errors.push('Base currency must be a 3-letter currency code (e.g., INR, USD, EUR)');
    }
  }

  // Validate monthlyStatedIncome
  if (monthlyStatedIncome !== undefined) {
    const income = Number(monthlyStatedIncome);
    if (isNaN(income) || income < 0) {
      errors.push('Monthly stated income must be a non-negative number');
    }
  }

  // Validate savingsTargetPercentage
  if (savingsTargetPercentage !== undefined) {
    const target = Number(savingsTargetPercentage);
    if (isNaN(target) || target < 0 || target > 100) {
      errors.push('Savings target percentage must be between 0 and 100');
    }
  }

  // Validate riskTolerance
  if (riskTolerance !== undefined) {
    const validTolerances = ['LOW', 'MODERATE', 'HIGH'];
    if (
      typeof riskTolerance !== 'string' ||
      !validTolerances.includes(riskTolerance.trim().toUpperCase())
    ) {
      errors.push(`Risk tolerance must be one of: ${validTolerances.join(', ')}`);
    }
  }

  // Validate notificationPreferences
  if (notificationPreferences !== undefined) {
    if (
      typeof notificationPreferences !== 'object' ||
      notificationPreferences === null ||
      Array.isArray(notificationPreferences)
    ) {
      errors.push('Notification preferences must be a valid JSON object');
    } else {
      if (
        notificationPreferences.budget_threshold_pct !== undefined &&
        (isNaN(Number(notificationPreferences.budget_threshold_pct)) ||
          Number(notificationPreferences.budget_threshold_pct) < 1 ||
          Number(notificationPreferences.budget_threshold_pct) > 100)
      ) {
        errors.push('budget_threshold_pct must be a number between 1 and 100');
      }
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
  validateProfileUpdateInput,
};

