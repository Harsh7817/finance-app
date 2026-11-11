const prisma = require('../config/prisma');

/**
 * Record or grant consent for a specific purpose and scope.
 * 
 * @param {string} userId - User UUID
 * @param {Object} consentData
 * @param {string} consentData.purpose - e.g. "SMS_PARSING", "BANK_STATEMENT_PROCESSING", "ANALYTICS"
 * @param {string} consentData.scope - e.g. "READ_TRANSACTIONS", "FINANCIAL_PROFILING"
 * @param {string} [consentData.consentVersion='1.0']
 * @param {Date|string} [consentData.expiresAt]
 * @param {string} [consentData.ipAddress]
 * @param {string} [consentData.userAgent]
 * @returns {Object} Created consent record
 */
const grantConsent = async (userId, {
  purpose,
  scope,
  consentVersion = '1.0',
  expiresAt,
  ipAddress,
  userAgent,
}) => {
  return await prisma.consent.create({
    data: {
      userId,
      purpose,
      scope,
      status: 'GRANTED',
      consentVersion,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });
};

/**
 * Retrieve all consents for an authenticated user.
 * 
 * @param {string} userId - User UUID
 * @param {Object} [filter]
 * @param {string} [filter.status] - Optional filter by status ('GRANTED', 'WITHDRAWN', 'EXPIRED')
 * @returns {Array<Object>} List of consents
 */
const getUserConsents = async (userId, filter = {}) => {
  const where = { userId };

  if (filter.status) {
    where.status = filter.status.toUpperCase();
  }

  return await prisma.consent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Check if active/valid consent is currently granted for a purpose.
 * 
 * @param {string} userId - User UUID
 * @param {string} purpose - Purpose identifier
 * @returns {boolean} Whether valid consent exists
 */
const hasActiveConsent = async (userId, purpose) => {
  const activeConsent = await prisma.consent.findFirst({
    where: {
      userId,
      purpose,
      status: 'GRANTED',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  return Boolean(activeConsent);
};

/**
 * Withdraw/revoke an existing consent.
 * 
 * @param {string} userId - User UUID
 * @param {string} consentId - Consent UUID
 * @returns {Object} Updated consent record
 */
const withdrawConsent = async (userId, consentId) => {
  const consent = await prisma.consent.findFirst({
    where: {
      id: consentId,
      userId,
    },
  });

  if (!consent) {
    const error = new Error('Consent record not found');
    error.statusCode = 404;
    throw error;
  }

  if (consent.status === 'WITHDRAWN') {
    const error = new Error('Consent has already been withdrawn');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.consent.update({
    where: { id: consentId },
    data: {
      status: 'WITHDRAWN',
      withdrawnAt: new Date(),
    },
  });
};

module.exports = {
  grantConsent,
  getUserConsents,
  hasActiveConsent,
  withdrawConsent,
};

