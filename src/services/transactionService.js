const crypto = require('crypto');
const prisma = require('../config/prisma');

/**
 * Generate a deterministic SHA-256 hash representing a transaction reference
 * for duplicate candidate tracking and uniqueness validation.
 */
const generateReferenceHash = ({ accountId, amount, type, transactionAt, merchantName }) => {
  const normalizedMerchant = (merchantName || '').trim().toLowerCase();
  const dateStr = new Date(transactionAt).toISOString().split('T')[0];
  const amtStr = Number(amount).toFixed(2);
  const raw = `${accountId}|${amtStr}|${type}|${dateStr}|${normalizedMerchant}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
};

/**
 * Clean and normalize a merchant name
 * Removes noise words like POS, UPI, INF, etc.
 */
const normalizeMerchantName = (merchant) => {
  if (!merchant) return 'Unknown Merchant';
  let cleaned = merchant
    .replace(/(?:POS|UPI|INF|IMPS|NEFT|RTGS|BIL|INB|VPS|ECOM)[\/\\-]/gi, ' ')
    .replace(/[^\w\s&.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length > 0 ? cleaned : merchant.trim();
};

/**
 * Create a manual transaction (income, expense, fee, refund).
 * Also updates account's cached balance deterministically.
 */
const createTransaction = async (userId, data) => {
  const {
    accountId,
    categoryId,
    amount,
    currency = 'INR',
    type, // 'DEBIT' | 'CREDIT' | 'FEE' | 'REFUND'
    merchantName,
    description,
    transactionAt = new Date(),
    isRecurring = false,
    externalReference,
  } = data;

  return await prisma.$transaction(async (tx) => {
    // 1. Validate account ownership
    const account = await tx.financialAccount.findFirst({
      where: { id: accountId, userId, deletedAt: null },
    });
    if (!account) {
      const error = new Error('Financial account not found');
      error.statusCode = 404;
      throw error;
    }

    // 2. Validate category
    let finalCategoryId = categoryId;
    if (finalCategoryId) {
      const category = await tx.category.findFirst({
        where: {
          id: finalCategoryId,
          OR: [{ userId: null }, { userId }],
        },
      });
      if (!category) {
        const error = new Error('Category not found');
        error.statusCode = 404;
        throw error;
      }
    } else {
      // Pick fallback default category
      const fallbackCat = await tx.category.findFirst({
        where: {
          categoryType: type === 'CREDIT' ? 'INCOME' : 'EXPENSE',
          userId: null,
        },
      });
      finalCategoryId = fallbackCat?.id;
    }

    const cleanMerchant = normalizeMerchantName(merchantName);
    const parsedAmount = Number(amount);
    const txDate = new Date(transactionAt);
    const refHash = generateReferenceHash({
      accountId,
      amount: parsedAmount,
      type,
      transactionAt: txDate,
      merchantName: cleanMerchant,
    });

    // 3. Create the transaction record
    const transaction = await tx.transaction.create({
      data: {
        userId,
        accountId,
        categoryId: finalCategoryId,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        type,
        status: 'POSTED',
        duplicateStatus: 'NOT_DUPLICATE',
        merchantName: merchantName ? merchantName.trim() : 'Manual Entry',
        cleanMerchantName: cleanMerchant,
        description: description || null,
        transactionAt: txDate,
        postingDate: txDate,
        referenceHash: refHash,
        externalReference: externalReference || null,
        isRecurring: Boolean(isRecurring),
        isUserVerified: true,
      },
      include: {
        category: true,
        account: {
          select: {
            id: true,
            accountName: true,
            accountType: true,
          },
        },
      },
    });

    // 4. Deterministically update the account cached balance
    // CREDIT increases balance; DEBIT / FEE decreases balance
    const balanceDelta = type === 'CREDIT' || type === 'REFUND' ? parsedAmount : -parsedAmount;
    await tx.financialAccount.update({
      where: { id: accountId },
      data: {
        cachedBalance: {
          increment: balanceDelta,
        },
      },
    });

    return transaction;
  });
};

/**
 * Record a transfer transaction between two accounts.
 * Creates:
 *  1. DEBIT transaction in source account.
 *  2. CREDIT transaction in destination account.
 *  3. Transfer record linking both transactions.
 * Prevents double counting in income/expense analytics.
 */
const recordTransfer = async (userId, data) => {
  const {
    sourceAccountId,
    destinationAccountId,
    amount,
    currency = 'INR',
    transferDate = new Date(),
    notes,
  } = data;

  if (sourceAccountId === destinationAccountId) {
    const error = new Error('Source and destination accounts must be different');
    error.statusCode = 400;
    throw error;
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    const error = new Error('Transfer amount must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    // Validate both accounts
    const [sourceAccount, destAccount] = await Promise.all([
      tx.financialAccount.findFirst({ where: { id: sourceAccountId, userId, deletedAt: null } }),
      tx.financialAccount.findFirst({ where: { id: destinationAccountId, userId, deletedAt: null } }),
    ]);

    if (!sourceAccount || !destAccount) {
      const error = new Error('One or both financial accounts could not be found');
      error.statusCode = 404;
      throw error;
    }

    // Find or fallback to Transfer category
    let transferCategory = await tx.category.findFirst({
      where: { categoryType: 'TRANSFER', userId: null },
    });

    if (!transferCategory) {
      transferCategory = await tx.category.create({
        data: {
          name: 'Account Transfer',
          categoryType: 'TRANSFER',
          userId: null,
        },
      });
    }

    const tDate = new Date(transferDate);

    // 1. Source Debit Transaction
    const sourceTx = await tx.transaction.create({
      data: {
        userId,
        accountId: sourceAccountId,
        categoryId: transferCategory.id,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        type: 'TRANSFER',
        status: 'POSTED',
        merchantName: `Transfer to ${destAccount.accountName}`,
        cleanMerchantName: destAccount.accountName,
        description: notes || `Transfer to ${destAccount.accountName}`,
        transactionAt: tDate,
        postingDate: tDate,
        referenceHash: generateReferenceHash({
          accountId: sourceAccountId,
          amount: parsedAmount,
          type: 'TRANSFER',
          transactionAt: tDate,
          merchantName: `Transfer to ${destAccount.accountName}`,
        }),
        isUserVerified: true,
      },
    });

    // 2. Destination Credit Transaction
    const destTx = await tx.transaction.create({
      data: {
        userId,
        accountId: destinationAccountId,
        categoryId: transferCategory.id,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        type: 'TRANSFER',
        status: 'POSTED',
        merchantName: `Transfer from ${sourceAccount.accountName}`,
        cleanMerchantName: sourceAccount.accountName,
        description: notes || `Transfer from ${sourceAccount.accountName}`,
        transactionAt: tDate,
        postingDate: tDate,
        referenceHash: generateReferenceHash({
          accountId: destinationAccountId,
          amount: parsedAmount,
          type: 'TRANSFER',
          transactionAt: tDate,
          merchantName: `Transfer from ${sourceAccount.accountName}`,
        }),
        isUserVerified: true,
      },
    });

    // 3. Link via Transfer entity
    const transfer = await tx.transfer.create({
      data: {
        userId,
        sourceAccountId,
        destinationAccountId,
        sourceTransactionId: sourceTx.id,
        destinationTransactionId: destTx.id,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        status: 'SETTLED',
        transferDate: tDate,
        notes: notes || null,
      },
      include: {
        sourceAccount: { select: { id: true, accountName: true } },
        destinationAccount: { select: { id: true, accountName: true } },
      },
    });

    // 4. Update balances
    await tx.financialAccount.update({
      where: { id: sourceAccountId },
      data: { cachedBalance: { decrement: parsedAmount } },
    });
    await tx.financialAccount.update({
      where: { id: destinationAccountId },
      data: { cachedBalance: { increment: parsedAmount } },
    });

    return transfer;
  });
};

/**
 * Edit an existing transaction details (merchant, category, description, isRecurring).
 */
const updateTransaction = async (userId, transactionId, updateData) => {
  const { merchantName, categoryId, description, isRecurring, status } = updateData;

  const existingTx = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, deletedAt: null },
  });

  if (!existingTx) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  const dataToUpdate = {};

  if (merchantName !== undefined) {
    dataToUpdate.merchantName = merchantName.trim();
    dataToUpdate.cleanMerchantName = normalizeMerchantName(merchantName);
  }

  if (categoryId !== undefined) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ userId: null }, { userId }],
      },
    });
    if (!category) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }
    dataToUpdate.categoryId = categoryId;
  }

  if (description !== undefined) {
    dataToUpdate.description = description;
  }

  if (isRecurring !== undefined) {
    dataToUpdate.isRecurring = Boolean(isRecurring);
  }

  if (status !== undefined) {
    const validStatuses = ['POSTED', 'PENDING', 'FLAGGED_FOR_REVIEW', 'RECONCILED', 'EXCLUDED'];
    if (!validStatuses.includes(status)) {
      const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    dataToUpdate.status = status;
  }

  return await prisma.transaction.update({
    where: { id: transactionId },
    data: dataToUpdate,
    include: {
      category: true,
      account: { select: { id: true, accountName: true } },
    },
  });
};

/**
 * Exclude or reverse a transaction according to application rules.
 *  - Exclude: marks transaction status as 'EXCLUDED' so analytics skip it.
 *  - Reverse: creates a compensating reversal transaction and reverses the cached balance.
 */
const excludeOrReverseTransaction = async (userId, transactionId, action, reason) => {
  const existingTx = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, deletedAt: null },
    include: { account: true },
  });

  if (!existingTx) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  if (action === 'EXCLUDE') {
    return await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'EXCLUDED',
        metadata: {
          ...(typeof existingTx.metadata === 'object' && existingTx.metadata !== null ? existingTx.metadata : {}),
          excludedReason: reason || 'Manually excluded by user',
          excludedAt: new Date().toISOString(),
        },
      },
      include: { category: true, account: true },
    });
  }

  if (action === 'REVERSE') {
    return await prisma.$transaction(async (tx) => {
      // Create reversal transaction
      const reversalType = existingTx.type === 'CREDIT' ? 'DEBIT' : 'CREDIT';
      const reversal = await tx.transaction.create({
        data: {
          userId,
          accountId: existingTx.accountId,
          categoryId: existingTx.categoryId,
          amount: existingTx.amount,
          currency: existingTx.currency,
          type: 'REVERSAL',
          status: 'POSTED',
          merchantName: `Reversal: ${existingTx.merchantName}`,
          cleanMerchantName: existingTx.cleanMerchantName,
          description: reason || `Reversal of transaction ${existingTx.id}`,
          transactionAt: new Date(),
          postingDate: new Date(),
          referenceHash: generateReferenceHash({
            accountId: existingTx.accountId,
            amount: existingTx.amount,
            type: 'REVERSAL',
            transactionAt: new Date(),
            merchantName: `Reversal: ${existingTx.merchantName}`,
          }),
          originalTransactionId: existingTx.id,
          isUserVerified: true,
        },
      });

      // Compensate balance
      const balanceDelta = reversalType === 'CREDIT' ? Number(existingTx.amount) : -Number(existingTx.amount);
      await tx.financialAccount.update({
        where: { id: existingTx.accountId },
        data: {
          cachedBalance: {
            increment: balanceDelta,
          },
        },
      });

      return reversal;
    });
  }

  const error = new Error("Invalid action. Must be 'EXCLUDE' or 'REVERSE'");
  error.statusCode = 400;
  throw error;
};

/**
 * Retrieve user's transaction history with advanced search, filtering, sorting, and pagination.
 *
 * Supported filters & options:
 *  - search: Search term matching merchantName, cleanMerchantName, or description (case-insensitive)
 *  - accountId: Filter by specific financial account
 *  - categoryId: Filter by category UUID
 *  - type: Filter by TransactionType ('DEBIT', 'CREDIT', 'TRANSFER', 'REFUND', 'REVERSAL', 'FEE')
 *  - status: Filter by TransactionStatus ('POSTED', 'PENDING', 'FLAGGED_FOR_REVIEW', 'RECONCILED', 'EXCLUDED')
 *  - startDate & endDate: Date range filter on transactionAt
 *  - minAmount & maxAmount: Amount range filter
 *  - sortBy: 'date' (default) | 'amount'
 *  - sortOrder: 'desc' (default) | 'asc'
 *  - page: page number (default 1)
 *  - limit: items per page (default 20, max 100)
 */
const getTransactions = async (userId, filters = {}) => {
  const {
    search,
    accountId,
    categoryId,
    type,
    status,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    sortBy = 'date',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = filters;

  const where = {
    userId,
    deletedAt: null,
  };

  // 1. Text search across merchant, clean merchant, and description
  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { merchantName: { contains: term, mode: 'insensitive' } },
      { cleanMerchantName: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
    ];
  }

  // 2. Filter by account
  if (accountId) where.accountId = accountId;

  // 3. Filter by category
  if (categoryId) where.categoryId = categoryId;

  // 4. Filter by transaction type
  if (type) where.type = type.toUpperCase();

  // 5. Filter by status
  if (status) where.status = status.toUpperCase();

  // 6. Filter by date range
  if (startDate || endDate) {
    where.transactionAt = {};
    if (startDate) where.transactionAt.gte = new Date(startDate);
    if (endDate) {
      const endD = new Date(endDate);
      // If time not specified, include until end of day
      if (!endDate.includes('T')) {
        endD.setUTCHours(23, 59, 59, 999);
      }
      where.transactionAt.lte = endD;
    }
  }

  // 7. Filter by amount range
  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {};
    if (minAmount !== undefined && !isNaN(Number(minAmount))) {
      where.amount.gte = Number(minAmount);
    }
    if (maxAmount !== undefined && !isNaN(Number(maxAmount))) {
      where.amount.lte = Number(maxAmount);
    }
  }

  // 8. Sorting
  const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';
  let orderBy = { transactionAt: orderDirection };
  if (sortBy === 'amount') {
    orderBy = { amount: orderDirection };
  } else if (sortBy === 'date') {
    orderBy = { transactionAt: orderDirection };
  }

  // 9. Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const takeNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skipNum = (pageNum - 1) * takeNum;

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      skip: skipNum,
      take: takeNum,
      orderBy,
      include: {
        category: {
          select: { id: true, name: true, categoryType: true, icon: true, colorHex: true },
        },
        account: {
          select: { id: true, accountName: true, accountType: true, currency: true },
        },
      },
    }),
  ]);

  return {
    items: transactions,
    pagination: {
      total,
      page: pageNum,
      limit: takeNum,
      totalPages: Math.ceil(total / takeNum),
      hasMore: pageNum * takeNum < total,
    },
  };
};

module.exports = {
  createTransaction,
  recordTransfer,
  updateTransaction,
  excludeOrReverseTransaction,
  getTransactions,
  normalizeMerchantName,
};

