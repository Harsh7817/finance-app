const { getUserProfile, updateUserProfile } = require('../services/profileService');
const { successResponse } = require('../utils/response');

/**
 * Controller to get authenticated user's profile
 */
const getProfile = async (req, res, next) => {
  try {
    const userProfile = await getUserProfile(req.user.id);

    return successResponse(res, {
      status: 200,
      message: 'User profile retrieved successfully',
      data: userProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update authenticated user's profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const updatedProfile = await updateUserProfile(req.user.id, req.body);

    return successResponse(res, {
      status: 200,
      message: 'User profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
};

