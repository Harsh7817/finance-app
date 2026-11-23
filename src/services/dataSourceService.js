const prisma = require('../config/prisma');

/**
 * Service to manage Financial Data Sources & Accounts.
 * Supports:
 *  - Creating/registering data sources (CSV_STATEMENT, ANDROID_SMS, MANUAL_INPUT).
 *  - Automatically creating or linking a logical financial account under the frozen schema.
 *  - Listing user data sources.
 *  - Retrieving and updating data sources.
 *  - Deactivating data sources.
 *  - Optional manual financial account management.
 */

const VALID_SOURCE_TYPES = ['CSV_STATEMENT', 'ANDROID_SMS', 'MANUAL_INPUT'];
const VALID_ACCOUNT_TYPES = ['SAVINGS', 'CURRENT', 'CREDIT_CARD', 'WALLET', 'CASH', 'INVESTMENT'];

/**
 * Create a new Data Source for the user.
 * If accountId is provided, attaches to existing account.
 * If accountId is omitted, automatically provisions/links an internal logical account for the source.
 * 
 * @param {string} userId
 * @param {Object} data
 * @param {string} data.sourceType - 'CSV_STATEMENT' | 'ANDROID_SMS' | 'MANUAL_INPUT'
 * @param {string} data.providerName - e.g. 'HDFC Bank', 'SBI Bank', 'Android SMS Service'
 * @param {string} [data.accountId] - Optional ID of an existing account
 * @param {string} [data.accountName] - Optional name for auto-created account (e.g. 'HDFC Statement Account')
 * @param {string} [data.accountType='SAVINGS'] - Account type
 * @param {string} [data.currency='INR']
 * @param {Object} [data.metadata={}]
 */
const createDataSource = async (userId, data) => {
  const {
    sourceType,
    providerName,
    accountId,
    accountName,
    accountType = 'SAVINGS',
    currency = 'INR',
    metadata = {},
  } = data;

  return await prisma.$transaction(async (tx) => {
    let targetAccountId = accountId;

    if (targetAccountId) {
      // Validate account belongs to this user
      const existingAccount = await tx.financialAccount.findFirst({
        where: { id: targetAccountId, userId, deletedAt: null },
      });
      if (!existingAccount) {
        const error = new Error('Specified financial account not found');
        error.statusCode = 404;
        throw error;
      }
    } else {
      // Create a logical account to back this data source so foreign-key constraints in transactions are met
      const createdAccount = await tx.financialAccount.create({
        data: {
          userId,
          accountName: accountName || `${providerName} Account`,
          accountType: VALID_ACCOUNT_TYPES.includes(accountType) ? accountType : 'SAVINGS',
          institutionName: providerName,
          currency: currency.toUpperCase(),
        },
      });
      targetAccountId = createdAccount.id;
    }

    const dataSource = await tx.dataSource.create({
      data: {
        userId,
        accountId: targetAccountId,
        sourceType,
        providerName,
        metadata,
      },
      include: {
        account: {
          select: {
            id: true,
            accountName: true,
            accountType: true,
            institutionName: true,
            currency: true,
            cachedBalance: true,
            status: true,
          },
        },
      },
    });

    return dataSource;
  });
};

/**
 * Retrieve all data sources for a user
 * 
 * @param {string} userId
 * @param {Object} [filter]
 * @param {boolean} [filter.isActive]
 * @param {string} [filter.sourceType]
 */
const getUserDataSources = async (userId, filter = {}) => {
  const where = { userId };

  if (filter.isActive !== undefined) {
    where.isActive = filter.isActive;
  }

  if (filter.sourceType) {
    where.sourceType = filter.sourceType;
  }

  return await prisma.dataSource.findMany({
    where,
    include: {
      account: {
        select: {
          id: true,
          accountName: true,
          accountType: true,
          institutionName: true,
          currency: true,
          cachedBalance: true,
          status: true,
        },
      },
      _count: {
        select: {
          importBatches: true,
          rawMessages: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Retrieve a specific data source by ID
 * 
 * @param {string} userId
 * @param {string} sourceId
 */
const getDataSourceById = async (userId, sourceId) => {
  const dataSource = await prisma.dataSource.findFirst({
    where: { id: sourceId, userId },
    include: {
      account: {
        select: {
          id: true,
          accountName: true,
          accountType: true,
          institutionName: true,
          currency: true,
          cachedBalance: true,
          status: true,
        },
      },
      importBatches: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!dataSource) {
    const error = new Error('Data source not found');
    error.statusCode = 404;
    throw error;
  }

  return dataSource;
};

/**
 * Update a data source
 * 
 * @param {string} userId
 * @param {string} sourceId
 * @param {Object} updateData
 */
const updateDataSource = async (userId, sourceId, updateData) => {
  const existingSource = await prisma.dataSource.findFirst({
    where: { id: sourceId, userId },
  });

  if (!existingSource) {
    const error = new Error('Data source not found');
    error.statusCode = 404;
    throw error;
  }

  const dataToUpdate = {};
  if (updateData.providerName !== undefined) {
    dataToUpdate.providerName = updateData.providerName;
  }
  if (updateData.isActive !== undefined) {
    dataToUpdate.isActive = Boolean(updateData.isActive);
  }
  if (updateData.metadata !== undefined) {
    dataToUpdate.metadata = {
      ...(typeof existingSource.metadata === 'object' && existingSource.metadata !== null ? existingSource.metadata : {}),
      ...updateData.metadata,
    };
  }

  return await prisma.dataSource.update({
    where: { id: sourceId },
    data: dataToUpdate,
    include: {
      account: true,
    },
  });
};

/**
 * Optional: Manual creation of Financial Accounts (if user wants to customize or create independent accounts)
 * 
 * @param {string} userId
 * @param {Object} accountData
 */
const createFinancialAccount = async (userId, accountData) => {
  const {
    accountName,
    accountType = 'SAVINGS',
    institutionName,
    accountMask,
    currency = 'INR',
    openingBalance = 0.00,
  } = accountData;

  return await prisma.$transaction(async (tx) => {
    const account = await tx.financialAccount.create({
      data: {
        userId,
        accountName,
        accountType: VALID_ACCOUNT_TYPES.includes(accountType) ? accountType : 'SAVINGS',
        institutionName,
        accountMask: accountMask || null,
        currency: currency.toUpperCase(),
        cachedBalance: Number(openingBalance),
      },
    });

    if (Number(openingBalance) !== 0) {
      await tx.accountBalanceSnapshot.create({
        data: {
          accountId: account.id,
          userId,
          balanceAmount: Number(openingBalance),
          asOfTimestamp: new Date(),
          snapshotSource: 'OPENING_BALANCE',
          statementReference: 'Initial opening balance',
          isReconciled: true,
        },
      });
    }

    return account;
  });
};

/**
 * List user's financial accounts
 * 
 * @param {string} userId
 */
const getUserAccounts = async (userId) => {
  return await prisma.financialAccount.findMany({
    where: { userId, deletedAt: null },
    include: {
      dataSources: {
        select: {
          id: true,
          sourceType: true,
          providerName: true,
          isActive: true,
        },
      },
      _count: {
        select: {
          transactions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Soft delete a financial account and deactivate its data sources
 * 
 * @param {string} userId
 * @param {string} accountId
 */
const deleteFinancialAccount = async (userId, accountId) => {
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId, deletedAt: null },
  });

  if (!account) {
    const error = new Error('Financial account not found');
    error.statusCode = 404;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    // Deactivate associated data sources
    await tx.dataSource.updateMany({
      where: { accountId, userId },
      data: { isActive: false },
    });

    // Mark account as deleted
    return await tx.financialAccount.update({
      where: { id: accountId },
      data: {
        deletedAt: new Date(),
        status: 'CLOSED',
      },
    });
  });
};

module.exports = {
  createDataSource,
  getUserDataSources,
  getDataSourceById,
  updateDataSource,
  createFinancialAccount,
  getUserAccounts,
  deleteFinancialAccount,
  VALID_SOURCE_TYPES,
  VALID_ACCOUNT_TYPES,
};

