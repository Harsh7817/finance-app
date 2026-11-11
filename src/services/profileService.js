const prisma = require('../config/prisma');

/**
 * Retrieve user profile for an authenticated user.
 * 
 * @param {string} userId - User UUID
 * @returns {Object} User and profile details
 */
const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        select: {
          id: true,
          baseCurrency: true,
          monthlyStatedIncome: true,
          savingsTargetPercentage: true,
          riskTolerance: true,
          notificationPreferences: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!user || user.deletedAt) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

/**
 * Update user profile settings for an authenticated user.
 * Allows updating baseCurrency, monthlyStatedIncome, savingsTargetPercentage,
 * riskTolerance, and notificationPreferences.
 * 
 * @param {string} userId - User UUID
 * @param {Object} updateData - Partial update payload
 * @returns {Object} Updated user profile
 */
const updateUserProfile = async (userId, updateData) => {
  const {
    baseCurrency,
    monthlyStatedIncome,
    savingsTargetPercentage,
    riskTolerance,
    notificationPreferences,
  } = updateData;

  // Verify user exists and has a profile
  const existingProfile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!existingProfile) {
    const error = new Error('User profile not found');
    error.statusCode = 404;
    throw error;
  }

  // Build profile update fields
  const dataToUpdate = {};

  if (baseCurrency !== undefined) {
    dataToUpdate.baseCurrency = baseCurrency.trim().toUpperCase();
  }

  if (monthlyStatedIncome !== undefined) {
    dataToUpdate.monthlyStatedIncome = Number(monthlyStatedIncome);
  }

  if (savingsTargetPercentage !== undefined) {
    dataToUpdate.savingsTargetPercentage = Number(savingsTargetPercentage);
  }

  if (riskTolerance !== undefined) {
    dataToUpdate.riskTolerance = riskTolerance.trim().toUpperCase();
  }

  if (notificationPreferences !== undefined) {
    // Merge existing preferences with new preferences
    const currentPrefs =
      typeof existingProfile.notificationPreferences === 'object' && existingProfile.notificationPreferences !== null
        ? existingProfile.notificationPreferences
        : {};
    dataToUpdate.notificationPreferences = {
      ...currentPrefs,
      ...notificationPreferences,
    };
  }

  const updatedProfile = await prisma.userProfile.update({
    where: { userId },
    data: dataToUpdate,
    select: {
      id: true,
      userId: true,
      baseCurrency: true,
      monthlyStatedIncome: true,
      savingsTargetPercentage: true,
      riskTolerance: true,
      notificationPreferences: true,
      updatedAt: true,
    },
  });

  return updatedProfile;
};

module.exports = {
  getUserProfile,
  updateUserProfile,
};

