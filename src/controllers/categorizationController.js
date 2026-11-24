/**
 * categorizationController.js
 * HTTP handlers for the Smart Transaction Categorization System.
 */

const {
  correctTransactionCategory,
  bulkCategorizeTransactions,
  getUncategorizedTransactions,
  getCategorizationSummary,
} = require('../services/categorizationService');
const {
  getUserMappings,
  upsertUserMapping,
  updateUserMapping,
  deleteUserMapping,
} = require('../services/userMappingService');
const { successResponse } = require('../utils/response');

// ---- User Merchant Mappings ----

const listUserMappings = async (req, res, next) => {
  try {
    const mappings = await getUserMappings(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'User merchant mappings retrieved',
      data: mappings,
    });
  } catch (err) {
    next(err);
  }
};

const createUserMapping = async (req, res, next) => {
  try {
    const { merchantName, counterpartyIdentifier, categoryId } = req.body;
    if (!merchantName || !categoryId) {
      return res.status(400).json({ success: false, message: 'merchantName and categoryId are required' });
    }
    const mapping = await upsertUserMapping(req.user.id, { merchantName, counterpartyIdentifier, categoryId });
    return successResponse(res, {
      status: 201,
      message: 'Merchant mapping saved',
      data: mapping,
    });
  } catch (err) {
    next(err);
  }
};

const modifyUserMapping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categoryId, merchantName } = req.body;
    const updated = await updateUserMapping(req.user.id, id, { categoryId, merchantName });
    return successResponse(res, {
      status: 200,
      message: 'Merchant mapping updated',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const removeUserMapping = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteUserMapping(req.user.id, id);
    return successResponse(res, {
      status: 200,
      message: 'Merchant mapping deleted',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

// ---- Categorization Summary ----

const categorizationSummary = async (req, res, next) => {
  try {
    const summary = await getCategorizationSummary(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Categorization summary retrieved',
      data: summary,
    });
  } catch (err) {
    next(err);
  }
};

// ---- Bulk Categorize ----

const bulkCategorize = async (req, res, next) => {
  try {
    const { transactionIds, categoryId, rememberMapping = false, merchantName, counterpartyIdentifier } = req.body;
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'transactionIds must be a non-empty array' });
    }
    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'categoryId is required' });
    }
    const result = await bulkCategorizeTransactions(
      req.user.id,
      transactionIds,
      categoryId,
      rememberMapping,
      merchantName,
      counterpartyIdentifier
    );
    return successResponse(res, {
      status: 200,
      message: `Bulk categorization complete: ${result.updatedCount} updated, ${result.skippedCount} skipped`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ---- Uncategorized Transactions ----

const listUncategorized = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const accountId = req.query.accountId || undefined;
    const result = await getUncategorizedTransactions(req.user.id, { limit, offset, accountId });
    return successResponse(res, {
      status: 200,
      message: 'Uncategorized transactions retrieved',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ---- Manual Category Update ----

const updateTxCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categoryId, feedbackText, rememberMapping = false } = req.body;
    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'categoryId is required' });
    }
    const updated = await correctTransactionCategory(req.user.id, id, categoryId, feedbackText, rememberMapping);
    return successResponse(res, {
      status: 200,
      message: 'Transaction category updated',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUserMappings,
  createUserMapping,
  modifyUserMapping,
  removeUserMapping,
  categorizationSummary,
  bulkCategorize,
  listUncategorized,
  updateTxCategory,
};

