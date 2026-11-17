/**
 * advisoryRoutes.js
 * API routes for Phase 11: AI-Powered Smart Expenditure Advisor
 */

const express = require('express');
const {
  evaluate,
  getHistory,
  getById,
  submitFeedback,
  getSummary,
} = require('../controllers/advisoryController');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  validateEvaluate,
  validateFeedback,
} = require('../middlewares/validateAdvisory');

const router = express.Router();

// All advisory routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/advisory/evaluate
 * @desc    Evaluate proposed purchase, return BUY/CONSIDER_WAITING/AVOID_FOR_NOW + AI explanation
 * @access  Protected
 */
router.post('/evaluate', validateEvaluate, evaluate);

/**
 * @route   GET /api/v1/advisory/history
 * @desc    Get user's past purchase evaluation requests and recommendations
 * @access  Protected
 */
router.get('/history', getHistory);

/**
 * @route   GET /api/v1/advisory/summary
 * @desc    Get summary metrics of advisory evaluations and outcome distributions
 * @access  Protected
 */
router.get('/summary', getSummary);

/**
 * @route   GET /api/v1/advisory/:requestId
 * @desc    Get details of a specific advisory decision
 * @access  Protected
 */
router.get('/:requestId', getById);

/**
 * @route   POST /api/v1/advisory/:requestId/feedback
 * @desc    Submit user feedback on recommendation usefulness
 * @access  Protected
 */
router.post('/:requestId/feedback', validateFeedback, submitFeedback);

module.exports = router;

