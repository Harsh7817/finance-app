const { errorResponse } = require('../utils/response');

const VALID_TRANSACTION_TYPES = ['DEBIT', 'CREDIT', 'TRANSFER', 'REFUND', 'REVERSAL', 'FEE'];

const validateCreateTransaction = (req, res, next) => {
  const { accountId, amount, type, merchantName, transactionAt } = req.body;
  const errors = [];

  if (!accountId || typeof accountId !== 'string') {
    errors.push('accountId is required');
  }

  if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push('amount is required and must be greater than zero');
  }

  if (!type || !VALID_TRANSACTION_TYPES.includes(type)) {
    errors.push(`type is required and must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`);
  }

  if (merchantName !== undefined && typeof merchantName !== 'string') {
    errors.push('merchantName must be a string');
  }

  if (transactionAt !== undefined) {
    const parsed = new Date(transactionAt);
    if (isNaN(parsed.getTime())) {
      errors.push('transactionAt must be a valid ISO-8601 date string');
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

const validateCreateTransfer = (req, res, next) => {
  const { sourceAccountId, destinationAccountId, amount, transferDate } = req.body;
  const errors = [];

  if (!sourceAccountId || typeof sourceAccountId !== 'string') {
    errors.push('sourceAccountId is required');
  }

  if (!destinationAccountId || typeof destinationAccountId !== 'string') {
    errors.push('destinationAccountId is required');
  }

  if (sourceAccountId === destinationAccountId) {
    errors.push('sourceAccountId and destinationAccountId cannot be the same');
  }

  if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push('amount must be a positive number greater than 0');
  }

  if (transferDate !== undefined) {
    const parsed = new Date(transferDate);
    if (isNaN(parsed.getTime())) {
      errors.push('transferDate must be a valid ISO-8601 date string');
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

const validateUpdateTransaction = (req, res, next) => {
  const { merchantName, categoryId, description, isRecurring, status } = req.body;

  const fields = [merchantName, categoryId, description, isRecurring, status].filter(
    (f) => f !== undefined
  );

  if (fields.length === 0) {
    return errorResponse(res, {
      status: 400,
      message: 'Validation failed',
      errors: ['At least one field must be provided for update'],
    });
  }

  next();
};

const validateAction = (req, res, next) => {
  const { action } = req.body;
  if (!['EXCLUDE', 'REVERSE'].includes(action)) {
    return errorResponse(res, {
      status: 400,
      message: "Action must be either 'EXCLUDE' or 'REVERSE'",
    });
  }
  next();
};

module.exports = {
  validateCreateTransaction,
  validateCreateTransfer,
  validateUpdateTransaction,
  validateAction,
};

