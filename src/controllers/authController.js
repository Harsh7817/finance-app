const { registerUser, loginUser } = require('../services/authService');
const { successResponse } = require('../utils/response');

/**
 * Controller to handle user registration
 */
const register = async (req, res, next) => {
  try {
    const {
      email,
      password,
      baseCurrency,
      monthlyStatedIncome,
      savingsTargetPercentage,
      riskTolerance,
      notificationPreferences,
    } = req.body;

    const user = await registerUser({
      email,
      password,
      baseCurrency,
      monthlyStatedIncome,
      savingsTargetPercentage,
      riskTolerance,
      notificationPreferences,
    });

    return successResponse(res, {
      status: 201,
      message: 'User registered successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle user login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await loginUser({ email, password });

    return successResponse(res, {
      status: 200,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle user logout
 * For stateless JWT, this confirms session invalidation on the client side.
 */
const logout = async (req, res) => {
  return successResponse(res, {
    status: 200,
    message: 'Logged out successfully',
  });
};

/**
 * Controller to return the currently authenticated user
 */
const getMe = async (req, res) => {
  return successResponse(res, {
    status: 200,
    message: 'Authenticated user profile retrieved',
    data: req.user,
  });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};
