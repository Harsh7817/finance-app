const express = require('express');
const { getProfile, updateProfile } = require('../controllers/profileController');
const { authenticate } = require('../middlewares/authMiddleware');
const { validateProfileUpdateInput } = require('../middlewares/validateProfile');

const router = express.Router();

// All profile routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/profile
 * @desc    Get authenticated user's profile and account settings
 * @access  Protected
 */
router.get('/', getProfile);

/**
 * @route   PATCH /api/v1/profile
 * @desc    Update authenticated user's profile (currency, preferences, savings target, risk tolerance)
 * @access  Protected
 */
router.patch('/', validateProfileUpdateInput, updateProfile);

module.exports = router;

