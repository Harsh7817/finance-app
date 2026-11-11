const {
  grantConsent,
  getUserConsents,
  withdrawConsent,
} = require('../services/consentService');
const { successResponse } = require('../utils/response');

/**
 * Controller to grant/record new consent
 */
const createConsent = async (req, res, next) => {
  try {
    const { purpose, scope, consentVersion, expiresAt } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const consent = await grantConsent(req.user.id, {
      purpose,
      scope,
      consentVersion,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return successResponse(res, {
      status: 201,
      message: 'Consent recorded successfully',
      data: consent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get all user consents
 */
const getConsents = async (req, res, next) => {
  try {
    const { status } = req.query;
    const consents = await getUserConsents(req.user.id, { status });

    return successResponse(res, {
      status: 200,
      message: 'Consents retrieved successfully',
      data: consents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to withdraw/revoke consent
 */
const revokeConsent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedConsent = await withdrawConsent(req.user.id, id);

    return successResponse(res, {
      status: 200,
      message: 'Consent withdrawn successfully',
      data: updatedConsent,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createConsent,
  getConsents,
  revokeConsent,
};

