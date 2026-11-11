const express = require('express');
const {
  addTransaction,
  addTransfer,
  modifyTransaction,
  handleTransactionAction,
  listTransactions,
} = require('../controllers/transactionController');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  validateCreateTransaction,
  validateCreateTransfer,
  validateUpdateTransaction,
  validateAction,
} = require('../middlewares/validateTransaction');

const router = express.Router();

// All transaction operations require authentication
router.use(authenticate);

// Transactions CRUD & History
router.get('/', listTransactions);
router.post('/', validateCreateTransaction, addTransaction);
router.post('/transfer', validateCreateTransfer, addTransfer);
router.patch('/:id', validateUpdateTransaction, modifyTransaction);
router.post('/:id/action', validateAction, handleTransactionAction);

module.exports = router;

