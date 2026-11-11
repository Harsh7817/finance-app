const express = require('express');
const {
  createConsent,
  getConsents,
  revokeConsent,
} = require('../controllers/consentController');
const { authenticate } = require('../middlewares/authMiddleware');
const { validateConsentInput } = require('../middlewares/validateConsent');

const router = express.Router();

// All consent routes are private/authenticated
router.use(authenticate);

/**
 * @route   POST /api/v1/consents
 * @desc    Record/grant user consent
 * @access  Protected
 */
router.post('/', validateConsentInput, createConsent);

/**
 * @route   GET /api/v1/consents
 * @desc    Get user's recorded consents (optional ?status=GRANTED/WITHDRAWN)
 * @access  Protected
 */
router.get('/', getConsents);

/**
 * @route   PATCH /api/v1/consents/:id/withdraw
 * @desc    Withdraw/revoke previously granted consent
 * @access  Protected
 */
router.patch('/:id/withdraw', revokeConsent);

module.exports = router;

