const express = require('express');
const {
  addGoal,
  getGoals,
  getGoalById,
  addContribution,
  getAnalytics,
  modifyGoal,
  removeGoal,
} = require('../controllers/goalController');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  validateGoalInput,
  validateContributionInput,
} = require('../middlewares/validateGoal');

const router = express.Router();

// Require authentication for all goal endpoints
router.use(authenticate);

// Goals CRUD & Analytics
router.post('/', validateGoalInput, addGoal);
router.get('/', getGoals);
router.get('/analytics', getAnalytics);
router.get('/:id', getGoalById);
router.patch('/:id', modifyGoal);
router.delete('/:id', removeGoal);

// Contributions
router.post('/:id/contributions', validateContributionInput, addContribution);

module.exports = router;

