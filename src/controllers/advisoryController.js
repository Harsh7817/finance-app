/**
 * advisoryController.js
 * Controller handling requests for Phase 11: AI-Powered Smart Expenditure Advisor
 */

const {
  evaluatePurchase,
  getAdvisoryHistory,
  getAdvisoryById,
  submitAdvisoryFeedback,
  getAdvisorySummary,
} = require('../services/advisoryService');
const { successResponse } = require('../utils/response');

/**
 * 11.2 - 11.4 Evaluate a proposed purchase and generate recommendation + AI explanation
 */
const evaluate = async (req, res, next) => {
  try {
    const result = await evaluatePurchase(req.user.id, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Purchase evaluated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11.5 Get advisory history for user
 */
const getHistory = async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const history = await getAdvisoryHistory(req.user.id, { limit, offset });
    return successResponse(res, {
      status: 200,
      message: 'Advisory history retrieved successfully',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single advisory decision by ID
 */
const getById = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const details = await getAdvisoryById(req.user.id, requestId);
    return successResponse(res, {
      status: 200,
      message: 'Advisory details retrieved successfully',
      data: details,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11.5 Submit user feedback on recommendation
 */
const submitFeedback = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const feedback = await submitAdvisoryFeedback(req.user.id, requestId, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Feedback submitted successfully',
      data: { feedback },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get summary metrics of user's advisory requests
 */
const getSummary = async (req, res, next) => {
  try {
    const summary = await getAdvisorySummary(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Advisory summary retrieved successfully',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  evaluate,
  getHistory,
  getById,
  submitFeedback,
  getSummary,
};

