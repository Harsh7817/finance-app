const express = require('express');
const {
  listCategories,
  addCustomCategory,
  testCategoryPrediction,
  updateTransactionCategory,
  getCategorizationHistory,
} = require('../controllers/categoryController');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  validateCategoryCorrection,
  validateCreateCategory,
} = require('../middlewares/validateCategory');

const router = express.Router();

// Require authentication for all category endpoints
router.use(authenticate);

// Category discovery & management
router.get('/', listCategories);
router.post('/custom', validateCreateCategory, addCustomCategory);
router.post('/predict', testCategoryPrediction);

// Transaction category correction & audit log
router.patch('/transactions/:id/correct', validateCategoryCorrection, updateTransactionCategory);
router.get('/transactions/:id/history', getCategorizationHistory);

module.exports = router;

