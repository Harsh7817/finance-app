/**
 * recurringController.js
 * Phase 9 — Recurring Expenditure Management
 */

const recurringService = require('../services/recurringService');
const { successResponse, errorResponse } = require('../utils/response');

// ---------------------------------------------------------------------------
// 9.1 — CRUD
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/recurring
 * Create a new recurring commitment manually.
 */
async function addCommitment(req, res, next) {
  try {
    const commitment = await recurringService.createCommitment(req.user.id, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Recurring commitment created successfully',
      data: commitment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/recurring
 * List recurring commitments with optional filters.
 */
async function listCommitments(req, res, next) {
  try {
    const result = await recurringService.listCommitments(req.user.id, req.query);
    return successResponse(res, {
      status: 200,
      message: 'Recurring commitments retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/recurring/:id
 * Get a single recurring commitment.
 */
async function getCommitment(req, res, next) {
  try {
    const commitment = await recurringService.getCommitmentById(req.user.id, req.params.id);
    return successResponse(res, {
      status: 200,
      message: 'Recurring commitment retrieved successfully',
      data: commitment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/recurring/:id
 * Update a recurring commitment.
 */
async function modifyCommitment(req, res, next) {
  try {
    const updated = await recurringService.updateCommitment(
      req.user.id,
      req.params.id,
      req.body
    );
    return successResponse(res, {
      status: 200,
      message: 'Recurring commitment updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/recurring/:id
 * Delete a recurring commitment.
 */
async function removeCommitment(req, res, next) {
  try {
    const result = await recurringService.deleteCommitment(req.user.id, req.params.id);
    return successResponse(res, {
      status: 200,
      message: 'Recurring commitment deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/recurring/:id/confirm
 * Confirm an auto-detected recurring commitment.
 */
async function confirmCommitment(req, res, next) {
  try {
    const updated = await recurringService.confirmCommitment(req.user.id, req.params.id);
    return successResponse(res, {
      status: 200,
      message: 'Recurring commitment confirmed successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// 9.2 — Detection
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/recurring/detect
 * Trigger automatic recurring pattern detection on transaction history.
 */
async function detectPatterns(req, res, next) {
  try {
    const lookbackDays = parseInt(req.body.lookbackDays) || 90;
    const result = await recurringService.detectRecurringPatterns(req.user.id, lookbackDays);
    return successResponse(res, {
      status: 200,
      message: `Pattern detection completed. Found ${result.detected} new recurring pattern(s).`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// 9.3 — Monitoring
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/recurring/upcoming
 * Get upcoming recurring expenses (default: next 30 days).
 */
async function getUpcoming(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await recurringService.getUpcomingExpenses(req.user.id, days);
    return successResponse(res, {
      status: 200,
      message: 'Upcoming recurring expenses retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/recurring/monthly-total
 * Get total monthly recurring expenditure (normalised across all frequencies).
 */
async function getMonthlyTotal(req, res, next) {
  try {
    const result = await recurringService.getMonthlyRecurringTotal(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Monthly recurring total retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/recurring/alerts
 * Get subscription alerts — forgotten subscriptions and amount changes.
 */
async function getAlerts(req, res, next) {
  try {
    const result = await recurringService.getSubscriptionAlerts(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Subscription alerts retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addCommitment,
  listCommitments,
  getCommitment,
  modifyCommitment,
  removeCommitment,
  confirmCommitment,
  detectPatterns,
  getUpcoming,
  getMonthlyTotal,
  getAlerts,
};

