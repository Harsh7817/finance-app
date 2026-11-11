const express = require('express');
const { register, login, logout, getMe } = require('../controllers/authController');
const { validateRegisterInput, validateLoginInput } = require('../middlewares/validateAuth');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateRegisterInput, register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and get JWT token
 * @access  Public
 */
router.post('/login', validateLoginInput, login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    User logout
 * @access  Protected
 */
router.post('/logout', authenticate, logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated user details
 * @access  Protected
 */
router.get('/me', authenticate, getMe);

module.exports = router;
