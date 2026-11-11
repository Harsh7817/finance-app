const {
  predictCategory,
  correctTransactionCategory,
  getCategories,
  createCustomCategory,
  getTransactionCategorizationHistory,
} = require('../services/categorizationService');
const { successResponse } = require('../utils/response');

/**
 * Controller to list all categories
 */
const listCategories = async (req, res, next) => {
  try {
    const { type } = req.query;
    const categories = await getCategories(req.user.id, type);
    return successResponse(res, {
      status: 200,
      message: 'Categories retrieved successfully',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to create a user-defined category
 */
const addCustomCategory = async (req, res, next) => {
  try {
    const newCategory = await createCustomCategory(req.user.id, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Custom category created successfully',
      data: newCategory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to test category prediction for arbitrary merchant text
 */
const testCategoryPrediction = async (req, res, next) => {
  try {
    const { text, type } = req.body;
    const prediction = await predictCategory(req.user.id, text, type);
    return successResponse(res, {
      status: 200,
      message: 'Category prediction computed',
      data: prediction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to correct/override a transaction's category
 */
const updateTransactionCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categoryId, feedbackText } = req.body;
    const updatedTx = await correctTransactionCategory(req.user.id, id, categoryId, feedbackText);
    return successResponse(res, {
      status: 200,
      message: 'Transaction category corrected successfully',
      data: updatedTx,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get categorization history for a transaction
 */
const getCategorizationHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await getTransactionCategorizationHistory(req.user.id, id);
    return successResponse(res, {
      status: 200,
      message: 'Categorization history retrieved successfully',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCategories,
  addCustomCategory,
  testCategoryPrediction,
  updateTransactionCategory,
  getCategorizationHistory,
};

