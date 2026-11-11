const {
  createBudget,
  getBudgetTracking,
  checkBudgetAlerts,
  getBudgetAnalytics,
  updateBudget,
  deleteBudget,
} = require('../services/budgetService');
const { successResponse } = require('../utils/response');

/**
 * Controller to create a new budget
 */
const addBudget = async (req, res, next) => {
  try {
    const budget = await createBudget(req.user.id, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Budget created successfully',
      data: budget,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to list tracked budgets with real-time spending
 */
const listBudgets = async (req, res, next) => {
  try {
    const { status } = req.query;
    const budgets = await getBudgetTracking(req.user.id, { status });
    return successResponse(res, {
      status: 200,
      message: 'Budgets tracking retrieved successfully',
      data: budgets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to check budget limits and trigger notifications
 */
const getAlerts = async (req, res, next) => {
  try {
    const alerts = await checkBudgetAlerts(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Budget alerts evaluated',
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get historical budget analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await getBudgetAnalytics(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Budget analytics retrieved successfully',
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update budget
 */
const modifyBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateBudget(req.user.id, id, req.body);
    return successResponse(res, {
      status: 200,
      message: 'Budget updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to delete budget
 */
const removeBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deleteBudget(req.user.id, id);
    return successResponse(res, {
      status: 200,
      message: 'Budget deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addBudget,
  listBudgets,
  getAlerts,
  getAnalytics,
  modifyBudget,
  removeBudget,
};

