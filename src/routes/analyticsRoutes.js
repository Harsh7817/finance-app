const express = require('express');
const {
  getOverview,
  getExpenses,
  getComparisons,
  getVisualizations,
} = require('../controllers/analyticsController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Analytics endpoints require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get financial dashboard overview (income, expenditure, balances, net savings, savings rate)
 * @access  Protected
 */
router.get('/overview', getOverview);

/**
 * @route   GET /api/v1/analytics/expenses
 * @desc    Get detailed expense analytics (category-wise, account-wise, daily, weekly, monthly)
 * @access  Protected
 */
router.get('/expenses', getExpenses);

/**
 * @route   GET /api/v1/analytics/comparisons
 * @desc    Get historical comparisons (Month-over-Month, Week-over-Week, category trends)
 * @access  Protected
 */
router.get('/comparisons', getComparisons);

/**
 * @route   GET /api/v1/analytics/visualizations
 * @desc    Get chart-ready visualization feeds for Figma/Frontend charts
 * @access  Protected
 */
router.get('/visualizations', getVisualizations);

module.exports = router;
