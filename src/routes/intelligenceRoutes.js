/**
 * intelligenceRoutes.js
 * API routes for Phase 10: Financial Intelligence and Prediction Engine
 */

const express = require('express');
const {
  getSpending,
  getForecast,
  getHealth,
  getAnomalies,
  recordPrediction,
  getEvaluations,
} = require('../controllers/intelligenceController');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  validateRecordForecast,
  validateQueryOptions,
} = require('../middlewares/validateIntelligence');

const router = express.Router();

// All intelligence endpoints require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/intelligence/spending-patterns
 * @desc    Get spending velocity, category breakdown, merchant frequency, trends
 * @access  Protected
 */
router.get('/spending-patterns', validateQueryOptions, getSpending);

/**
 * @route   GET /api/v1/intelligence/forecast
 * @desc    Get deterministic month-end expense forecast and balance projection
 * @access  Protected
 */
router.get('/forecast', validateQueryOptions, getForecast);

/**
 * @route   GET /api/v1/intelligence/health-score
 * @desc    Get 0-100 composite Financial Health Index & diagnostic insights
 * @access  Protected
 */
router.get('/health-score', getHealth);

/**
 * @route   GET /api/v1/intelligence/anomalies
 * @desc    Get statistical transaction outliers (Z-scores) and daily spending surges
 * @access  Protected
 */
router.get('/anomalies', validateQueryOptions, getAnomalies);

/**
 * @route   POST /api/v1/intelligence/forecast/record
 * @desc    Store generated forecast snapshot into `Prediction` table
 * @access  Protected
 */
router.post('/forecast/record', validateRecordForecast, recordPrediction);

/**
 * @route   GET /api/v1/intelligence/forecast/evaluations
 * @desc    Evaluate historical forecasts against settled actuals (MAPE / Accuracy)
 * @access  Protected
 */
router.get('/forecast/evaluations', getEvaluations);

module.exports = router;

