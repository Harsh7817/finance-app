const { errorResponse } = require('../utils/response');

/**
 * Middleware to validate registration request body.
 */
const validateRegisterInput = (req, res, next) => {
  const { email, password, baseCurrency, monthlyStatedIncome, savingsTargetPercentage, riskTolerance } = req.body;

  const errors = [];

  // Email validation
  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Invalid email format');
    }
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Optional fields validation
  if (baseCurrency !== undefined) {
    if (typeof baseCurrency !== 'string' || baseCurrency.trim().length !== 3) {
      errors.push('Base currency must be a 3-letter currency code (e.g., INR, USD)');
    }
  }

  if (monthlyStatedIncome !== undefined) {
    const income = Number(monthlyStatedIncome);
    if (isNaN(income) || income < 0) {
      errors.push('Monthly stated income must be a non-negative number');
    }
  }

  if (savingsTargetPercentage !== undefined) {
    const target = Number(savingsTargetPercentage);
    if (isNaN(target) || target < 0 || target > 100) {
      errors.push('Savings target percentage must be between 0 and 100');
    }
  }

  if (riskTolerance !== undefined) {
    const validTolerances = ['LOW', 'MODERATE', 'HIGH'];
    if (!validTolerances.includes(riskTolerance.toUpperCase())) {
      errors.push(`Risk tolerance must be one of: ${validTolerances.join(', ')}`);
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

/**
 * Middleware to validate login request body.
 */
const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;

  const errors = [];

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('Email is required');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
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
  validateRegisterInput,
  validateLoginInput,
};
