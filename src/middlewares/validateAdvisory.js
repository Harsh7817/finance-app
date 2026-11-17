const { errorResponse } = require('../utils/response');

/**
 * Validates request body for purchase affordability evaluation
 */
const validateEvaluate = (req, res, next) => {
  const { purchaseAmount, itemDescription, categoryId, userNotes } = req.body;
  const errors = [];

  if (purchaseAmount === undefined || isNaN(Number(purchaseAmount)) || Number(purchaseAmount) <= 0) {
    errors.push('purchaseAmount is required and must be a number greater than zero');
  }

  if (!itemDescription || typeof itemDescription !== 'string' || itemDescription.trim().length < 2) {
    errors.push('itemDescription is required and must be at least 2 characters');
  }

  if (itemDescription && itemDescription.length > 255) {
    errors.push('itemDescription must not exceed 255 characters');
  }

  if (categoryId !== undefined && (typeof categoryId !== 'string' || categoryId.trim().length === 0)) {
    errors.push('categoryId must be a valid string if provided');
  }

  if (userNotes !== undefined && typeof userNotes !== 'string') {
    errors.push('userNotes must be a string if provided');
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
 * Validates request body for advisory feedback submission
 */
const validateFeedback = (req, res, next) => {
  const { rating, feedbackText, wasHelpful } = req.body;
  const errors = [];

  if (rating !== undefined) {
    const r = parseInt(rating, 10);
    if (isNaN(r) || r < 1 || r > 5) {
      errors.push('rating must be an integer between 1 and 5');
    }
  }

  if (feedbackText !== undefined && typeof feedbackText !== 'string') {
    errors.push('feedbackText must be a string if provided');
  }

  if (wasHelpful !== undefined && typeof wasHelpful !== 'boolean') {
    errors.push('wasHelpful must be a boolean (true/false) if provided');
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
  validateEvaluate,
  validateFeedback,
};

