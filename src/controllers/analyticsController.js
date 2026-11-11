const {
  getDashboardOverview,
  getExpenseAnalytics,
  getHistoricalComparisons,
  getVisualizationData,
} = require('../services/analyticsService');
const { successResponse } = require('../utils/response');

/**
 * Controller to get dashboard overview metrics
 */
const getOverview = async (req, res, next) => {
  try {
    const { timeframe, startDate, endDate } = req.query;
    const overview = await getDashboardOverview(req.user.id, {
      timeframe,
      startDate,
      endDate,
    });

    return successResponse(res, {
      status: 200,
      message: 'Dashboard overview retrieved successfully',
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get expense analytics & breakdowns
 */
const getExpenses = async (req, res, next) => {
  try {
    const { timeframe, startDate, endDate } = req.query;
    const analytics = await getExpenseAnalytics(req.user.id, {
      timeframe,
      startDate,
      endDate,
    });

    return successResponse(res, {
      status: 200,
      message: 'Expense analytics retrieved successfully',
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get historical comparisons (Month-over-Month, Week-over-Week, Trends)
 */
const getComparisons = async (req, res, next) => {
  try {
    const comparisons = await getHistoricalComparisons(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Historical comparisons retrieved successfully',
      data: comparisons,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get chart-ready visualization feeds for frontend
 */
const getVisualizations = async (req, res, next) => {
  try {
    const { months } = req.query;
    const visualizations = await getVisualizationData(req.user.id, {
      months: months ? parseInt(months, 10) : 6,
    });
    return successResponse(res, {
      status: 200,
      message: 'Visualization data retrieved successfully',
      data: visualizations,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getExpenses,
  getComparisons,
  getVisualizations,
};
