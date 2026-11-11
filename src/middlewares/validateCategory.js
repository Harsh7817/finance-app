const { errorResponse } = require('../utils/response');

const VALID_CAT_TYPES = ['EXPENSE', 'INCOME', 'TRANSFER', 'INVESTMENT'];

/**
 * Validate category correction input
 */
const validateCategoryCorrection = (req, res, next) => {
  const { categoryId } = req.body;

  if (!categoryId || typeof categoryId !== 'string') {
    return errorResponse(res, {
      status: 400,
      message: 'Validation failed',
      errors: ['categoryId is required to correct transaction category'],
    });
  }

  next();
};

/**
 * Validate custom category creation input
 */
const validateCreateCategory = (req, res, next) => {
  const { name, categoryType, colorHex } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('name is required');
  }

  if (categoryType && !VALID_CAT_TYPES.includes(categoryType.toUpperCase())) {
    errors.push(`categoryType must be one of: ${VALID_CAT_TYPES.join(', ')}`);
  }

  if (colorHex && !/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
    errors.push('colorHex must be a valid 6-character hex color (e.g. #3B82F6)');
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
  validateCategoryCorrection,
  validateCreateCategory,
};

