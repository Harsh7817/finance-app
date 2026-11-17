/**
 * intelligenceController.js
 * Controller handling requests for Phase 10: Financial Intelligence and Prediction Engine
 */

const {
  getSpendingPatterns,
  getFinancialForecast,
  getFinancialHealth,
  detectAnomalies,
  recordForecast,
  getForecastEvaluations,
} = require('../services/intelligenceService');
const { successResponse } = require('../utils/response');

/**
 * 10.1 Controller: Get spending pattern analysis
 */
const getSpending = async (req, res, next) => {
  try {
    const { lookbackDays } = req.query;
    const data = await getSpendingPatterns(req.user.id, { lookbackDays });
    return successResponse(res, {
      status: 200,
      message: 'Spending patterns analyzed successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10.2 Controller: Get financial forecasting & balance projection
 */
const getForecast = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const data = await getFinancialForecast(req.user.id, { year, month });
    return successResponse(res, {
      status: 200,
      message: 'Financial forecast calculated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10.3 Controller: Get comprehensive financial health score (0-100)
 */
const getHealth = async (req, res, next) => {
  try {
    const data = await getFinancialHealth(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Financial health evaluated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10.4 Controller: Detect spending anomalies and outliers
 */
const getAnomalies = async (req, res, next) => {
  try {
    const { lookbackDays } = req.query;
    const data = await detectAnomalies(req.user.id, { lookbackDays });
    return successResponse(res, {
      status: 200,
      message: 'Anomalies analyzed successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10.5 Controller: Record a prediction snapshot into database
 */
const recordPrediction = async (req, res, next) => {
  try {
    const prediction = await recordForecast(req.user.id, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Forecast recorded successfully',
      data: { prediction },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10.5 Controller: Evaluate historical predictions vs actual outcomes
 */
const getEvaluations = async (req, res, next) => {
  try {
    const data = await getForecastEvaluations(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Forecast evaluations retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSpending,
  getForecast,
  getHealth,
  getAnomalies,
  recordPrediction,
  getEvaluations,
};

