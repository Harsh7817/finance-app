const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

const SALT_ROUNDS = 12;

/**
 * Service to register a new user along with their default user profile.
 */
const registerUser = async ({
  email,
  password,
  baseCurrency = 'INR',
  monthlyStatedIncome = 0.00,
  savingsTargetPercentage = 20.00,
  riskTolerance = 'MODERATE',
  notificationPreferences,
}) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const error = new Error('Email is already registered');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Execute in a transaction to guarantee both user and default profile creation
  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
    });

    const defaultPreferences = notificationPreferences || {
      budget_threshold_pct: 80,
      forecast_warnings: true,
      email_alerts: false,
      in_app_alerts: true,
    };

    const profile = await tx.userProfile.create({
      data: {
        userId: user.id,
        baseCurrency,
        monthlyStatedIncome,
        savingsTargetPercentage,
        riskTolerance,
        notificationPreferences: defaultPreferences,
      },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      profile: {
        id: profile.id,
        baseCurrency: profile.baseCurrency,
        monthlyStatedIncome: profile.monthlyStatedIncome,
        savingsTargetPercentage: profile.savingsTargetPercentage,
        riskTolerance: profile.riskTolerance,
        notificationPreferences: profile.notificationPreferences,
      },
    };
  });

  return newUser;
};

/**
 * Service to authenticate user with email and password and issue JWT token.
 * 
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Object} Authenticated user details and JWT token
 */
const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Find user by email including their profile
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      profile: true,
    },
  });

  // Generic credential error to avoid leaking whether email exists
  if (!user || user.deletedAt) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check account status
  if (user.status !== 'ACTIVE') {
    const error = new Error(`Account is ${user.status.toLowerCase()}`);
    error.statusCode = 403;
    throw error;
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            id: user.profile.id,
            baseCurrency: user.profile.baseCurrency,
            monthlyStatedIncome: user.profile.monthlyStatedIncome,
            savingsTargetPercentage: user.profile.savingsTargetPercentage,
            riskTolerance: user.profile.riskTolerance,
            notificationPreferences: user.profile.notificationPreferences,
          }
        : null,
    },
  };
};

module.exports = {
  registerUser,
  loginUser,
};
