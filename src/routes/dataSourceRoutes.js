const express = require('express');
const {
  addDataSource,
  listDataSources,
  getDataSource,
  modifyDataSource,
  addAccount,
  listAccounts,
  removeAccount,
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
router.delete('/accounts/:id', removeAccount);

module.exports = router;

