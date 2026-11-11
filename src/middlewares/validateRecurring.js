/**
 * validateRecurring.js
 * Input validation middleware for Phase 9 — Recurring Expenditure Management
 */

const VALID_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
const VALID_STATUSES = ['ACTIVE', 'PAUSED', 'CANCELLED'];

/**
 * Validate creation of a recurring commitment.
 */
function validateCommitmentInput(req, res, next) {
  const errors = [];
  const { categoryId, merchantName, expectedAmount, frequency, nextExpectedDate } = req.body;

  if (!categoryId || typeof categoryId !== 'string' || !categoryId.trim()) {
    errors.push('categoryId is required');
  }

  if (!merchantName || typeof merchantName !== 'string' || !merchantName.trim()) {
    errors.push('merchantName is required and must be a non-empty string');
  }

  if (expectedAmount === undefined || expectedAmount === null) {
    errors.push('expectedAmount is required');
  } else {
    const amount = parseFloat(expectedAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('expectedAmount must be a positive number');
    }
  }

  if (!frequency) {
    errors.push('frequency is required');
  } else if (!VALID_FREQUENCIES.includes(frequency)) {
    errors.push(`frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`);
  }

  if (!nextExpectedDate) {
    errors.push('nextExpectedDate is required');
  } else if (isNaN(new Date(nextExpectedDate).getTime())) {
    errors.push('nextExpectedDate must be a valid date (ISO 8601)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
}

/**
 * Validate update of a recurring commitment.
 */
function validateCommitmentUpdate(req, res, next) {
  const errors = [];
  const {
    categoryId,
    merchantName,
    expectedAmount,
    frequency,
    nextExpectedDate,
    status,
    isUserConfirmed,
  } = req.body;

  // All fields are optional for PATCH; validate only what is provided
  if (categoryId !== undefined && (typeof categoryId !== 'string' || !categoryId.trim())) {
    errors.push('categoryId must be a non-empty string');
  }

  if (merchantName !== undefined && (typeof merchantName !== 'string' || !merchantName.trim())) {
    errors.push('merchantName must be a non-empty string');
  }

  if (expectedAmount !== undefined) {
    const amount = parseFloat(expectedAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('expectedAmount must be a positive number');
    }
  }

  if (frequency !== undefined && !VALID_FREQUENCIES.includes(frequency)) {
    errors.push(`frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`);
  }

  if (nextExpectedDate !== undefined && isNaN(new Date(nextExpectedDate).getTime())) {
    errors.push('nextExpectedDate must be a valid date (ISO 8601)');
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (isUserConfirmed !== undefined && typeof isUserConfirmed !== 'boolean') {
    errors.push('isUserConfirmed must be a boolean');
  }

  if (Object.keys(req.body).length === 0) {
    errors.push('At least one field must be provided for update');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
}

module.exports = {
  validateCommitmentInput,
  validateCommitmentUpdate,
};

