const {
  createTransaction,
  recordTransfer,
  updateTransaction,
  excludeOrReverseTransaction,
  getTransactions,
} = require('../services/transactionService');
const { successResponse } = require('../utils/response');

/**
 * Controller to create an income/expense/fee transaction
 */
const addTransaction = async (req, res, next) => {
  try {
    const transaction = await createTransaction(req.user.id, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Transaction created successfully',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to record an inter-account transfer
 */
const addTransfer = async (req, res, next) => {
  try {
    const transfer = await recordTransfer(req.user.id, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Transfer recorded successfully',
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update transaction details
 */
const modifyTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateTransaction(req.user.id, id, req.body);
    return successResponse(res, {
      status: 200,
      message: 'Transaction updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to exclude or reverse a transaction
 */
const handleTransactionAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    const result = await excludeOrReverseTransaction(req.user.id, id, action, reason);

    return successResponse(res, {
      status: 200,
      message: `Transaction successfully ${action.toLowerCase()}d`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get transaction history with pagination
 */
const listTransactions = async (req, res, next) => {
  try {
    const result = await getTransactions(req.user.id, req.query);
    return successResponse(res, {
      status: 200,
      message: 'Transactions retrieved successfully',
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addTransaction,
  addTransfer,
  modifyTransaction,
  handleTransactionAction,
  listTransactions,
};

