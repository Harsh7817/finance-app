const express = require('express');
const {
  addDataSource,
  listDataSources,
  getDataSource,
  modifyDataSource,
  addAccount,
  listAccounts,
} = require('../controllers/dataSourceController');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  validateDataSourceInput,
  validateFinancialAccountInput,
} = require('../middlewares/validateDataSource');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Data Sources Endpoints
router.post('/sources', validateDataSourceInput, addDataSource);
router.get('/sources', listDataSources);
router.get('/sources/:id', getDataSource);
router.patch('/sources/:id', modifyDataSource);

// Optional Financial Accounts Endpoints
router.post('/accounts', validateFinancialAccountInput, addAccount);
router.get('/accounts', listAccounts);

module.exports = router;

