/**
 * userMappingService.js
 * Manages user-specific merchant/counterparty → category mappings.
 * Each mapping is strictly scoped to the owning user.
 */

const prisma = require('../config/prisma');
const { normalizeName } = require('./merchantExtractor');

/**
 * Look up a user-specific merchant mapping.
 * Priority: counterpartyIdentifier (UPI ID) > normalizedMerchantName
 *
 * @param {string} userId
 * @param {{ normalizedName: string, counterpartyIdentifier: string|null }} opts
 * @returns {Promise<UserMerchantMapping|null>}
 */
const findUserMapping = async (userId, { normalizedName, counterpartyIdentifier }) => {
  // Priority 1: stable UPI ID or counterparty identifier
  if (counterpartyIdentifier) {
    const byId = await prisma.userMerchantMapping.findFirst({
      where: { userId, counterpartyIdentifier },
      include: { category: true },
    });
    if (byId) return byId;
  }

  // Priority 2: normalized merchant name (only if meaningful)
  if (normalizedName && normalizedName !== 'unknown' && normalizedName.length > 1) {
    return await prisma.userMerchantMapping.findFirst({
      where: { userId, normalizedMerchantName: normalizedName },
      include: { category: true },
    });
  }

  return null;
};

/**
 * Create or update a user merchant mapping (upsert).
 * Uses counterpartyIdentifier as primary key when available,
 * falls back to (userId, normalizedMerchantName).
 *
 * @param {string} userId
 * @param {{ merchantName: string, counterpartyIdentifier?: string, categoryId: string }} opts
 */
const upsertUserMapping = async (userId, { merchantName, counterpartyIdentifier, categoryId }) => {
  if (!merchantName || !categoryId) {
    const err = new Error('merchantName and categoryId are required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedMerchantName = normalizeName(merchantName);

  // Validate category is accessible to this user
  const category = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ userId: null }, { userId }], isActive: true },
  });
  if (!category) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  // Upsert by counterpartyIdentifier when present
  if (counterpartyIdentifier) {
    return await prisma.userMerchantMapping.upsert({
      where: { uq_user_counterparty_mapping: { userId, counterpartyIdentifier } },
      update: {
        categoryId,
        merchantName,
        normalizedMerchantName,
        updatedAt: new Date(),
      },
      create: {
        userId,
        merchantName,
        normalizedMerchantName,
        counterpartyIdentifier,
        categoryId,
      },
      include: { category: true },
    });
  }

  // Fall back to normalizedMerchantName upsert
  return await prisma.userMerchantMapping.upsert({
    where: { uq_user_merchant_mapping: { userId, normalizedMerchantName } },
    update: {
      categoryId,
      merchantName,
      updatedAt: new Date(),
    },
    create: {
      userId,
      merchantName,
      normalizedMerchantName,
      categoryId,
    },
    include: { category: true },
  });
};

/**
 * List all user merchant mappings (most recently updated first).
 */
const getUserMappings = async (userId) => {
  return await prisma.userMerchantMapping.findMany({
    where: { userId },
    include: {
      category: {
        select: { id: true, name: true, categoryType: true, colorHex: true, icon: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
};

/**
 * Update a specific user mapping (category or merchant name).
 */
const updateUserMapping = async (userId, mappingId, { categoryId, merchantName }) => {
  const mapping = await prisma.userMerchantMapping.findFirst({
    where: { id: mappingId, userId },
  });
  if (!mapping) {
    const err = new Error('Mapping not found');
    err.statusCode = 404;
    throw err;
  }

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, OR: [{ userId: null }, { userId }], isActive: true },
    });
    if (!category) {
      const err = new Error('Category not found');
      err.statusCode = 404;
      throw err;
    }
  }

  const updateData = { updatedAt: new Date() };
  if (categoryId) updateData.categoryId = categoryId;
  if (merchantName) {
    updateData.merchantName = merchantName;
    updateData.normalizedMerchantName = normalizeName(merchantName);
  }

  return await prisma.userMerchantMapping.update({
    where: { id: mappingId },
    data: updateData,
    include: {
      category: { select: { id: true, name: true, categoryType: true, colorHex: true, icon: true } },
    },
  });
};

/**
 * Delete a user mapping (user can only delete their own).
 */
const deleteUserMapping = async (userId, mappingId) => {
  const mapping = await prisma.userMerchantMapping.findFirst({
    where: { id: mappingId, userId },
  });
  if (!mapping) {
    const err = new Error('Mapping not found');
    err.statusCode = 404;
    throw err;
  }
  return await prisma.userMerchantMapping.delete({ where: { id: mappingId } });
};

module.exports = {
  findUserMapping,
  upsertUserMapping,
  getUserMappings,
  updateUserMapping,
  deleteUserMapping,
};

