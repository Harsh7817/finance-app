/**
 * categorizationService.js
 * Smart Transaction Categorization Engine — 5-priority hybrid system.
 *
 * Priority chain:
 *   1. User-specific merchant mapping (USER_MAPPING)
 *   2. Global merchant database (GLOBAL_MERCHANT)
 *   3. Rule-based keyword matching (RULE_BASED)
 *   4. ML prediction placeholder (ML_PREDICTION — future)
 *   5. Uncategorized / NEEDS_REVIEW fallback
 */

const prisma = require('../config/prisma');
const { normalizeName } = require('./merchantExtractor');
const { findUserMapping } = require('./userMappingService');
const { findGlobalMerchant } = require('./merchantRepository');

// ============================================================================
// SYSTEM KEYWORD RULES
// Rule-based fallback: maps keyword patterns → category names
// ============================================================================
const SYSTEM_KEYWORD_RULES = [
  {
    categoryName: 'Food & Dining',
    keywords: [
      'swiggy', 'zomato', 'mcdonald', 'burger king', 'domino', 'pizza',
      'starbucks', 'cafe', 'restaurant', 'kfc', 'subway', 'dine', 'food',
      'baker', 'eat', 'barbeque', 'sweet', 'chai', 'dhaba', 'hotel',
    ],
  },
  {
    categoryName: 'Shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'croma',
      'reliance digital', 'mall', 'mart', 'meesho', 'retail', 'clothing',
      'apparel', 'fashion', 'h&m', 'zara', 'westside',
    ],
  },
  {
    categoryName: 'Transportation',
    keywords: [
      'uber', 'ola', 'rapido', 'metro', 'irctc', 'rail', 'fuel',
      'petrol', 'diesel', 'indian oil', 'hpcl', 'bpcl', 'shell',
      'toll', 'fastag', 'parking', 'bus', 'flight', 'indigo', 'spicejet',
    ],
  },
  {
    categoryName: 'Bills & Utilities',
    keywords: [
      'electricity', 'bescom', 'tneb', 'bses', 'water', 'gas', 'indane',
      'airtel', 'jio', 'vodafone', 'vi', 'broadband', 'wifi', 'utility',
      'bill', 'recharge', 'dth', 'tata play', 'bsnl',
    ],
  },
  {
    categoryName: 'Entertainment',
    keywords: [
      'netflix', 'spotify', 'hotstar', 'prime video', 'youtube',
      'bookmyshow', 'pvr', 'inox', 'cinema', 'theatre', 'game',
      'playstation', 'steam', 'disney', 'audible', 'sonyliv',
    ],
  },
  {
    categoryName: 'Groceries',
    keywords: [
      'blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart',
      'nature basket', 'supermarket', 'provision', 'grocery',
      'vegetable', 'fruit', 'dairy', 'milk', 'spencers',
    ],
  },
  {
    categoryName: 'Health & Wellness',
    keywords: [
      'apollo', 'pharmacy', 'chemist', 'hospital', 'clinic',
      'medplus', '1mg', 'pharmeasy', 'doctor', 'cult.fit', 'gym',
      'fitness', 'dental', 'diagnostic', 'pathology', 'netmeds',
    ],
  },
  {
    categoryName: 'Travel',
    keywords: [
      'makemytrip', 'goibibo', 'cleartrip', 'airbnb', 'hotel',
      'resort', 'booking.com', 'agoda', 'oyo', 'expedia',
    ],
  },
  {
    categoryName: 'Education',
    keywords: [
      'coursera', 'udemy', 'byjus', 'unacademy', 'school', 'college',
      'university', 'tuition', 'class', 'academy', 'books', 'education',
    ],
  },
  {
    categoryName: 'Salary',
    keywords: [
      'salary', 'payroll', 'wages', 'stipend', 'corp', 'technologies',
      'infotech', 'pvt ltd', 'private limited', 'solutions',
    ],
  },
  {
    categoryName: 'Investment',
    keywords: [
      'zerodha', 'groww', 'upstox', 'mutual fund', 'sip', 'nse', 'bse',
      'coin', 'shares', 'dividend', 'cred',
    ],
  },
];

// Confidence threshold: below this we mark as NEEDS_REVIEW
const CONFIDENCE_THRESHOLD = parseFloat(process.env.CATEGORIZATION_CONFIDENCE_THRESHOLD || '0.6');

// ============================================================================
// CATEGORIZATION ENGINE — 5-priority chain
// ============================================================================

/**
 * Predict category for a transaction using the 5-priority hybrid engine.
 *
 * @param {string} userId
 * @param {string} text - Raw description or narration
 * @param {string} type - 'DEBIT' | 'CREDIT' | 'TRANSFER'
 * @param {{
 *   normalizedName?: string,
 *   counterpartyIdentifier?: string,
 *   isMerchant?: boolean,
 *   isAmbiguous?: boolean,
 * }|null} extractedInfo - From merchantExtractor (optional)
 * @returns {Promise<{
 *   categoryId: string,
 *   categoryName: string,
 *   method: string,
 *   categorizationSource: string,
 *   categorizationStatus: string,
 *   confidenceScore: number|null,
 *   isAmbiguous: boolean,
 * }>}
 */
const predictCategory = async (userId, text, type, extractedInfo = null) => {
  const normalizedText = (text || '').toLowerCase().trim();
  const normalizedMerchantName = extractedInfo?.normalizedName || normalizeName(text);
  const counterpartyIdentifier = extractedInfo?.counterpartyIdentifier || null;
  const isAmbiguous = extractedInfo?.isAmbiguous ?? true;

  // --- Load all accessible categories once ---
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: null }, { userId }], isActive: true },
  });

  const catMapByName = new Map();
  const catMapById = new Map();
  categories.forEach((cat) => {
    catMapByName.set(cat.name.toLowerCase(), cat);
    catMapById.set(cat.id, cat);
  });

  // ----------------------------------------------------------------
  // PRIORITY 1: User-specific merchant/counterparty mapping
  // ----------------------------------------------------------------
  const userMapping = await findUserMapping(userId, {
    normalizedName: normalizedMerchantName,
    counterpartyIdentifier,
  });

  if (userMapping && catMapById.has(userMapping.categoryId)) {
    const cat = catMapById.get(userMapping.categoryId);
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      method: 'USER_MANUAL',
      categorizationSource: 'USER_MAPPING',
      categorizationStatus: 'AUTO_CATEGORIZED',
      confidenceScore: null, // Deterministic — no confidence needed
      isAmbiguous: false,
    };
  }

  // ----------------------------------------------------------------
  // PRIORITY 2: Global merchant database lookup
  // ----------------------------------------------------------------
  const globalMerchant = await findGlobalMerchant(normalizedMerchantName);

  if (globalMerchant && globalMerchant.defaultCategoryId && catMapById.has(globalMerchant.defaultCategoryId)) {
    const cat = catMapById.get(globalMerchant.defaultCategoryId);
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      method: 'RULE_BASED',
      categorizationSource: 'GLOBAL_MERCHANT',
      categorizationStatus: 'AUTO_CATEGORIZED',
      confidenceScore: null, // Deterministic
      isAmbiguous: false,
    };
  }

  // ----------------------------------------------------------------
  // PRIORITY 3: Rule-based keyword matching
  // ----------------------------------------------------------------
  for (const rule of SYSTEM_KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (normalizedText.includes(keyword)) {
        const cat = catMapByName.get(rule.categoryName.toLowerCase());
        if (cat) {
          // Validate transaction type compatibility
          const typeCompatible =
            (type === 'CREDIT' && (cat.categoryType === 'INCOME' || cat.categoryType === 'INVESTMENT')) ||
            (type === 'DEBIT' && (cat.categoryType === 'EXPENSE' || cat.categoryType === 'INVESTMENT' || cat.categoryType === 'TRANSFER')) ||
            !type;

          if (typeCompatible) {
            return {
              categoryId: cat.id,
              categoryName: cat.name,
              method: 'RULE_BASED',
              categorizationSource: 'RULE_BASED',
              categorizationStatus: 'AUTO_CATEGORIZED',
              confidenceScore: null, // Rule-based is deterministic
              isAmbiguous: false,
            };
          }
        }
      }
    }
  }

  // ----------------------------------------------------------------
  // PRIORITY 4: Learned user feedback (legacy compatibility)
  // Check Feedback table for previously confirmed merchant→category mappings
  // ----------------------------------------------------------------
  const previousFeedback = await prisma.feedback.findFirst({
    where: {
      userId,
      targetType: 'CATEGORIZATION',
      correctionData: {
        path: ['merchantText'],
        equals: normalizedMerchantName,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (previousFeedback && previousFeedback.correctionData?.newCategoryId) {
    const matchedCat = catMapById.get(previousFeedback.correctionData.newCategoryId);
    if (matchedCat) {
      return {
        categoryId: matchedCat.id,
        categoryName: matchedCat.name,
        method: 'USER_MANUAL',
        categorizationSource: 'USER_MAPPING',
        categorizationStatus: 'AUTO_CATEGORIZED',
        confidenceScore: null,
        isAmbiguous: false,
      };
    }
  }

  // ----------------------------------------------------------------
  // PRIORITY 5: Uncategorized / NEEDS_REVIEW
  // Pick a fallback category but flag for user review
  // ----------------------------------------------------------------
  const fallbackCatName = type === 'CREDIT' ? 'Miscellaneous Income' : 'Miscellaneous Expense';
  const fallbackCat = catMapByName.get(fallbackCatName.toLowerCase()) || categories[0];

  return {
    categoryId: fallbackCat.id,
    categoryName: fallbackCat.name,
    method: 'FALLBACK_DEFAULT',
    categorizationSource: 'UNCATEGORIZED',
    categorizationStatus: isAmbiguous ? 'NEEDS_REVIEW' : 'NEEDS_REVIEW',
    confidenceScore: null,
    isAmbiguous: true,
  };
};

// ============================================================================
// CATEGORIZATION LOG
// ============================================================================

const recordCategorizationLog = async ({
  transactionId,
  categoryId,
  method,
  confidenceScore,
  userOverridden = false,
  previousCategoryId = null,
}) => {
  return await prisma.categorizationLog.create({
    data: {
      transactionId,
      categoryId,
      method,
      confidenceScore: confidenceScore ? parseFloat(confidenceScore) : null,
      userOverridden,
      previousCategoryId,
    },
  });
};

// ============================================================================
// MANUAL CATEGORY CORRECTION
// ============================================================================

/**
 * User manually corrects a transaction's category.
 * Preserves audit trail via CategorizationLog.
 * Stores feedback for future learning.
 * Does NOT overwrite if already manually categorized unless forced.
 */
const correctTransactionCategory = async (userId, transactionId, newCategoryId, feedbackText, rememberMapping = false) => {
  return await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findFirst({
      where: { id: transactionId, userId, deletedAt: null },
      include: { category: true },
    });

    if (!transaction) {
      const error = new Error('Transaction not found');
      error.statusCode = 404;
      throw error;
    }

    const targetCategory = await tx.category.findFirst({
      where: { id: newCategoryId, OR: [{ userId: null }, { userId }], isActive: true },
    });

    if (!targetCategory) {
      const error = new Error('Target category not found');
      error.statusCode = 404;
      throw error;
    }

    const previousCategoryId = transaction.categoryId;

    // Update transaction
    const updatedTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        categoryId: newCategoryId,
        isUserVerified: true,
        categorizationStatus: 'MANUALLY_CATEGORIZED',
        categorizationSource: 'MANUAL',
        categorizedAt: new Date(),
      },
      include: { category: true, account: true },
    });

    // Audit log
    await tx.categorizationLog.create({
      data: {
        transactionId,
        categoryId: newCategoryId,
        previousCategoryId,
        method: 'USER_MANUAL',
        confidenceScore: null,
        userOverridden: true,
      },
    });

    // Feedback for future learning
    const merchantKey = (transaction.cleanMerchantName || transaction.merchantName || '').toLowerCase().trim();
    await tx.feedback.create({
      data: {
        userId,
        targetType: 'CATEGORIZATION',
        targetId: transactionId,
        rating: 5,
        feedbackText: feedbackText || `User corrected category from "${transaction.category.name}" to "${targetCategory.name}"`,
        correctionData: {
          merchantText: merchantKey,
          oldCategoryId: previousCategoryId,
          newCategoryId,
          newCategoryName: targetCategory.name,
        },
      },
    });

    return updatedTransaction;
  });
};

// ============================================================================
// BULK CATEGORIZATION
// ============================================================================

/**
 * Apply a category to multiple transactions at once.
 * Only modifies transactions belonging to userId.
 * Does NOT overwrite transactions already manually categorized unless forceOverwrite=true.
 *
 * @param {string} userId
 * @param {string[]} transactionIds
 * @param {string} categoryId
 * @param {boolean} rememberMapping - Save merchant→category mapping for future use
 * @param {string|null} merchantName - Required if rememberMapping=true
 * @param {string|null} counterpartyIdentifier - Optional stable identifier
 */
const bulkCategorizeTransactions = async (
  userId,
  transactionIds,
  categoryId,
  rememberMapping = false,
  merchantName = null,
  counterpartyIdentifier = null
) => {
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    const err = new Error('transactionIds must be a non-empty array');
    err.statusCode = 400;
    throw err;
  }

  // Validate category
  const category = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ userId: null }, { userId }], isActive: true },
  });
  if (!category) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  // Fetch only transactions belonging to this user
  const transactions = await prisma.transaction.findMany({
    where: {
      id: { in: transactionIds },
      userId,
      deletedAt: null,
      // Only update non-manually-categorized transactions
      NOT: { categorizationStatus: 'MANUALLY_CATEGORIZED' },
    },
  });

  const updatedIds = transactions.map((t) => t.id);

  if (updatedIds.length === 0) {
    return { updatedCount: 0, skippedCount: transactionIds.length };
  }

  // Bulk update
  await prisma.transaction.updateMany({
    where: { id: { in: updatedIds }, userId },
    data: {
      categoryId,
      isUserVerified: true,
      categorizationStatus: 'MANUALLY_CATEGORIZED',
      categorizationSource: 'MANUAL',
      categorizedAt: new Date(),
    },
  });

  // Create categorization logs for each transaction
  const logs = updatedIds.map((txId) => {
    const original = transactions.find((t) => t.id === txId);
    return {
      transactionId: txId,
      categoryId,
      previousCategoryId: original?.categoryId || null,
      method: 'USER_MANUAL',
      confidenceScore: null,
      userOverridden: true,
    };
  });
  await prisma.categorizationLog.createMany({ data: logs, skipDuplicates: true });

  // Save merchant mapping if requested
  if (rememberMapping && merchantName) {
    const { upsertUserMapping } = require('./userMappingService');
    await upsertUserMapping(userId, { merchantName, counterpartyIdentifier, categoryId });
  }

  return {
    updatedCount: updatedIds.length,
    skippedCount: transactionIds.length - updatedIds.length,
  };
};

// ============================================================================
// UNCATEGORIZED TRANSACTIONS
// ============================================================================

/**
 * Fetch transactions that need user review (NEEDS_REVIEW or no categorizationStatus)
 */
const getUncategorizedTransactions = async (userId, { limit = 50, offset = 0, accountId } = {}) => {
  const where = {
    userId,
    deletedAt: null,
    OR: [
      { categorizationStatus: 'NEEDS_REVIEW' },
      { isUserVerified: false, categorizationSource: 'UNCATEGORIZED' },
    ],
  };
  if (accountId) where.accountId = accountId;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, categoryType: true, colorHex: true, icon: true } },
        account: { select: { id: true, accountName: true } },
      },
      orderBy: { transactionAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total, limit, offset };
};

// ============================================================================
// CATEGORIZATION SUMMARY
// ============================================================================

/**
 * Summary statistics for categorization status of user's transactions.
 * Accurately aligns with categorized vs needs-review transactions.
 */
const getCategorizationSummary = async (userId) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    include: { category: true },
  });

  const total = transactions.length;

  // A transaction needs review if it's explicitly NEEDS_REVIEW, uncategorized,
  // unverified, or assigned to generic fallback miscellaneous categories without user confirmation
  let needsReview = 0;
  let autoCategorized = 0;
  let manuallyCategorized = 0;

  for (const t of transactions) {
    if (t.categorizationStatus === 'MANUALLY_CATEGORIZED' || t.categorizationSource === 'MANUAL') {
      manuallyCategorized++;
    } else if (
      t.categorizationStatus === 'NEEDS_REVIEW' ||
      t.categorizationSource === 'UNCATEGORIZED' ||
      !t.isUserVerified ||
      t.category?.name === 'Miscellaneous Expense' ||
      t.category?.name === 'Miscellaneous Income'
    ) {
      needsReview++;
    } else {
      autoCategorized++;
    }
  }

  const categorized = total - needsReview;

  return {
    total,
    autoCategorized,
    manuallyCategorized,
    needsReview,
    uncategorized: needsReview,
    categorized,
    categorizedPercentage: total > 0 ? Math.round((categorized / total) * 100) : 0,
  };
};

// ============================================================================
// CATEGORY MANAGEMENT (preserved from original)
// ============================================================================

const getCategories = async (userId, type) => {
  const where = {
    OR: [{ userId: null }, { userId }],
    isActive: true,
  };
  if (type) where.categoryType = type.toUpperCase();

  return await prisma.category.findMany({
    where,
    orderBy: [{ userId: 'desc' }, { name: 'asc' }],
  });
};

const createCustomCategory = async (userId, data) => {
  const { name, categoryType = 'EXPENSE', icon = 'tag', colorHex = '#3B82F6', parentId } = data;

  const existing = await prisma.category.findFirst({
    where: {
      name: { equals: name.trim(), mode: 'insensitive' },
      OR: [{ userId: null }, { userId }],
      isActive: true,
    },
  });

  if (existing) {
    const error = new Error(`Category "${name}" already exists`);
    error.statusCode = 409;
    throw error;
  }

  return await prisma.category.create({
    data: {
      userId,
      name: name.trim(),
      categoryType: categoryType.toUpperCase(),
      icon,
      colorHex,
      parentId: parentId || null,
    },
  });
};

const getTransactionCategorizationHistory = async (userId, transactionId) => {
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, deletedAt: null },
  });

  if (!tx) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  return await prisma.categorizationLog.findMany({
    where: { transactionId },
    include: {
      category: { select: { id: true, name: true, categoryType: true } },
      previousCategory: { select: { id: true, name: true, categoryType: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core engine
  predictCategory,
  recordCategorizationLog,
  // Manual correction
  correctTransactionCategory,
  // Bulk
  bulkCategorizeTransactions,
  // Queries
  getUncategorizedTransactions,
  getCategorizationSummary,
  // Category management
  getCategories,
  createCustomCategory,
  getTransactionCategorizationHistory,
  // Expose for tests
  SYSTEM_KEYWORD_RULES,
};
