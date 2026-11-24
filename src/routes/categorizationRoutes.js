/**
 * categorizationRoutes.js
 * Routes for Smart Transaction Categorization System.
 */

const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  listUserMappings,
  createUserMapping,
  modifyUserMapping,
  removeUserMapping,
  categorizationSummary,
  bulkCategorize,
  listUncategorized,
  updateTxCategory,
} = require('../controllers/categorizationController');

const router = express.Router();

// All categorization routes require authentication
router.use(authenticate);

// --- User Merchant Mappings ---
// GET  /api/v1/categorization/mappings        → list all user mappings
// POST /api/v1/categorization/mappings        → create/update a mapping
// PATCH /api/v1/categorization/mappings/:id   → update a specific mapping
// DELETE /api/v1/categorization/mappings/:id  → delete a mapping
router.get('/mappings', listUserMappings);
router.post('/mappings', createUserMapping);
router.patch('/mappings/:id', modifyUserMapping);
router.delete('/mappings/:id', removeUserMapping);

// --- Summary ---
// GET /api/v1/categorization/summary
router.get('/summary', categorizationSummary);

// --- Bulk Categorize ---
// POST /api/v1/categorization/bulk-categorize
router.post('/bulk-categorize', bulkCategorize);

// --- Uncategorized Transactions ---
// GET /api/v1/categorization/transactions/uncategorized
router.get('/transactions/uncategorized', listUncategorized);

// --- Manual Category Update for a Transaction ---
// PATCH /api/v1/categorization/transactions/:id/category
router.patch('/transactions/:id/category', updateTxCategory);

module.exports = router;

