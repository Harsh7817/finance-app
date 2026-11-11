/**
 * recurringRoutes.js
 * Phase 9 — Recurring Expenditure Management
 *
 * Route prefix: /api/v1/recurring
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { validateCommitmentInput, validateCommitmentUpdate } = require('../middlewares/validateRecurring');
const {
  addCommitment,
  listCommitments,
  getCommitment,
  modifyCommitment,
  removeCommitment,
  confirmCommitment,
  detectPatterns,
  getUpcoming,
  getMonthlyTotal,
  getAlerts,
} = require('../controllers/recurringController');

// All routes require authentication
router.use(authenticate);

// ── Monitoring (static segments must come before :id) ──────────────────────
router.get('/upcoming', getUpcoming);          // GET  /upcoming?days=30
router.get('/monthly-total', getMonthlyTotal); // GET  /monthly-total
router.get('/alerts', getAlerts);              // GET  /alerts

// ── Detection ──────────────────────────────────────────────────────────────
router.post('/detect', detectPatterns);        // POST /detect

// ── CRUD ───────────────────────────────────────────────────────────────────
router.post('/', validateCommitmentInput, addCommitment);          // POST  /
router.get('/', listCommitments);                                  // GET   /
router.get('/:id', getCommitment);                                 // GET   /:id
router.patch('/:id', validateCommitmentUpdate, modifyCommitment);  // PATCH /:id
router.delete('/:id', removeCommitment);                           // DELETE/:id
router.post('/:id/confirm', confirmCommitment);                    // POST  /:id/confirm

module.exports = router;

