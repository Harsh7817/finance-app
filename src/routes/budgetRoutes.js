const express = require('express');
const {
  addBudget,
  listBudgets,
  getAlerts,
  getAnalytics,
  modifyBudget,
  removeBudget,
} = require('../controllers/budgetController');
const { authenticate } = require('../middlewares/authMiddleware');
const { validateBudgetInput } = require('../middlewares/validateBudget');

const router = express.Router();

// Require authentication for all budget routes
router.use(authenticate);

// Budget CRUD & Tracking
router.post('/', validateBudgetInput, addBudget);
router.get('/', listBudgets);
router.get('/alerts', getAlerts);
router.get('/analytics', getAnalytics);
router.patch('/:id', modifyBudget);
router.delete('/:id', removeBudget);

module.exports = router;

