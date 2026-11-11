const {
  createFinancialGoal,
  recordGoalContribution,
  listUserGoals,
  getGoalDetails,
  getGoalAnalytics,
  updateGoal,
  deleteGoal,
} = require('../services/goalService');
const { successResponse } = require('../utils/response');

/**
 * Controller to create a new financial goal
 */
const addGoal = async (req, res, next) => {
  try {
    const goal = await createFinancialGoal(req.user.id, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Financial goal created successfully',
      data: goal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to list all user financial goals with progress
 */
const getGoals = async (req, res, next) => {
  try {
    const { status } = req.query;
    const goals = await listUserGoals(req.user.id, { status });
    return successResponse(res, {
      status: 200,
      message: 'Financial goals retrieved successfully',
      data: goals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get single goal details & contribution history
 */
const getGoalById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const goal = await getGoalDetails(req.user.id, id);
    return successResponse(res, {
      status: 200,
      message: 'Goal details retrieved successfully',
      data: goal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to record a contribution to a goal
 */
const addContribution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await recordGoalContribution(req.user.id, id, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Goal contribution recorded successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get goal analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await getGoalAnalytics(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Goal analytics retrieved successfully',
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update a goal
 */
const modifyGoal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateGoal(req.user.id, id, req.body);
    return successResponse(res, {
      status: 200,
      message: 'Goal updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to delete a goal
 */
const removeGoal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deleteGoal(req.user.id, id);
    return successResponse(res, {
      status: 200,
      message: 'Goal deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addGoal,
  getGoals,
  getGoalById,
  addContribution,
  getAnalytics,
  modifyGoal,
  removeGoal,
};

