const prisma = require('../config/prisma');

/**
 * Built-in Rule-based categorization keyword dictionaries.
 * Maps keywords to category names.
 */
const SYSTEM_KEYWORD_RULES = [
  // Food & Dining
  {
    categoryName: 'Food & Dining',
    keywords: [
      'swiggy', 'zomato', 'mcdonald', 'burger king', 'domino', 'pizza', 'starbucks', 'cafe',
      'restaurant', 'kfc', 'subway', 'dine', 'food', 'baker', 'eat', 'barbeque', 'sweet', 'chai',
    ],
  },
  // Shopping
  {
    categoryName: 'Shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'retail', 'clothing',
      'apparel', 'fashion', 'nykaa', 'croma', 'reliance digital', 'mall', 'mart',
    ],
  },
  // Transportation
  {
    categoryName: 'Transportation',
    keywords: [
      'uber', 'ola', 'rapido', 'metro', 'irctc', 'rail', 'fuel', 'petrol', 'diesel',
      'indian oil', 'hpcl', 'bpcl', 'shell', 'toll', 'fastag', 'parking', 'bus', 'flight', 'indigo',
    ],
  },
  // Bills & Utilities
  {
    categoryName: 'Bills & Utilities',
    keywords: [
      'electricity', 'bescom', 'tneb', 'bses', 'water', 'gas', 'indane', 'airtel', 'jio',
      'vodafone', 'vi', 'broadband', 'wifi', 'utility', 'bill', 'recharge', 'dth', 'tata play',
    ],
  },
  // Entertainment
  {
    categoryName: 'Entertainment',
    keywords: [
      'netflix', 'spotify', 'hotstar', 'prime video', 'youtube', 'bookmyshow', 'pvr', 'inox',
      'cinema', 'theatre', 'game', 'playstation', 'steam', 'disney', 'audible',
    ],
  },
  // Groceries
  {
    categoryName: 'Groceries',
    keywords: [
      'blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'nature basket', 'supermarket',
      'provision', 'grocery', 'vegetable', 'fruit', 'dairy', 'milk', 'spencer',
    ],
  },
  // Health & Wellness
  {
    categoryName: 'Health & Wellness',
    keywords: [
      'apollo', 'pharmacy', 'chemist', 'hospital', 'clinic', 'medplus', '1mg', 'pharmeasy',
      'doctor', 'cult.fit', 'gym', 'fitness', 'dental', 'diagnostic', 'pathology',
    ],
  },
  // Travel
  {
    categoryName: 'Travel',
    keywords: [
      'makemytrip', 'goibibo', 'cleartrip', 'airbnb', 'hotel', 'resort', 'booking.com',
      'agoda', 'stay', 'trip', 'expedia',
    ],
  },
  // Education
  {
    categoryName: 'Education',
    keywords: [
      'coursera', 'udemy', 'school', 'college', 'university', 'tuition', 'class', 'academy',
      'books', 'education', 'exam',
    ],
  },
  // Salary / Income
  {
    categoryName: 'Salary',
    keywords: [
      'salary', 'payroll', 'wages', 'stipend', 'corp', 'technologies', 'infotech', 'pvt ltd',
    ],
  },
  // Investments
  {
    categoryName: 'Investment',
    keywords: [
      'zerodha', 'groww', 'upstox', 'mutual fund', 'sip', 'nse', 'bse', 'coin', 'shares', 'dividend',
    ],
  },
];

/**
 * Predict category using rule-based keyword matching and learned user corrections.
 * 
 * @param {string} userId - User UUID
 * @param {string} text - Merchant name or narration
 * @param {string} type - TransactionType ('CREDIT' | 'DEBIT' | 'TRANSFER')
 * @returns {Promise<{ categoryId: string, categoryName: string, method: string, confidenceScore: number, isAmbiguous: boolean }>}
 */
const predictCategory = async (userId, text, type) => {
  const normalizedText = (text || '').toLowerCase().trim();

  // 1. Fetch all accessible categories (system categories + user-defined categories)
  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
      isActive: true,
    },
  });

  const catMapByName = new Map();
  const catMapById = new Map();
  categories.forEach((cat) => {
    catMapByName.set(cat.name.toLowerCase(), cat);
    catMapById.set(cat.id, cat);
  });

  // 2. Learned feedback / user history check:
  // Check if user previously corrected or categorized similar merchant text
  const previousFeedback = await prisma.feedback.findFirst({
    where: {
      userId,
      targetType: 'CATEGORIZATION',
      correctionData: {
        path: ['merchantText'],
        equals: normalizedText,
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
        confidenceScore: 0.99,
        isAmbiguous: false,
      };
    }
  }

  // 3. Rule-based keyword matching against SYSTEM_KEYWORD_RULES
  for (const rule of SYSTEM_KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (normalizedText.includes(keyword)) {
        const cat = catMapByName.get(rule.categoryName.toLowerCase());
        if (cat) {
          // If transaction type matches category type
          if (
            (type === 'CREDIT' && (cat.categoryType === 'INCOME' || cat.categoryType === 'INVESTMENT')) ||
            (type === 'DEBIT' && (cat.categoryType === 'EXPENSE' || cat.categoryType === 'INVESTMENT')) ||
            !type
          ) {
            return {
              categoryId: cat.id,
              categoryName: cat.name,
              method: 'RULE_BASED',
              confidenceScore: 0.85,
              isAmbiguous: false,
            };
          }
        }
      }
    }
  }

  // 4. Fallback Default Category
  const fallbackCatName = type === 'CREDIT' ? 'Miscellaneous Income' : 'Miscellaneous Expense';
  const fallbackCat = catMapByName.get(fallbackCatName.toLowerCase()) || categories[0];

  return {
    categoryId: fallbackCat.id,
    categoryName: fallbackCat.name,
    method: 'FALLBACK_DEFAULT',
    confidenceScore: 0.35,
    isAmbiguous: true, // Needs user review or is ambiguous
  };
};

/**
 * Log categorization decision into CategorizationLog
 */
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
      confidenceScore,
      userOverridden,
      previousCategoryId,
    },
  });
};

/**
 * User corrects/overrides transaction category.
 * Updates transaction, records CategorizationLog, and stores learned feedback for future rules.
 * 
 * @param {string} userId
 * @param {string} transactionId
 * @param {string} newCategoryId
 * @param {string} [feedbackText]
 */
const correctTransactionCategory = async (userId, transactionId, newCategoryId, feedbackText) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify transaction
    const transaction = await tx.transaction.findFirst({
      where: { id: transactionId, userId, deletedAt: null },
      include: { category: true },
    });

    if (!transaction) {
      const error = new Error('Transaction not found');
      error.statusCode = 404;
      throw error;
    }

    // 2. Verify target category
    const targetCategory = await tx.category.findFirst({
      where: {
        id: newCategoryId,
        OR: [{ userId: null }, { userId }],
        isActive: true,
      },
    });

    if (!targetCategory) {
      const error = new Error('Target category not found');
      error.statusCode = 404;
      throw error;
    }

    const previousCategoryId = transaction.categoryId;

    // 3. Update Transaction
    const updatedTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        categoryId: newCategoryId,
        isUserVerified: true,
      },
      include: {
        category: true,
        account: true,
      },
    });

    // 4. Record CategorizationLog audit record
    await tx.categorizationLog.create({
      data: {
        transactionId,
        categoryId: newCategoryId,
        previousCategoryId,
        method: 'USER_MANUAL',
        confidenceScore: 1.0,
        userOverridden: true,
      },
    });

    // 5. Store Feedback to train/improve future categorization rules
    const merchantKey = (transaction.cleanMerchantName || transaction.merchantName || '').toLowerCase().trim();

    await tx.feedback.create({
      data: {
        userId,
        targetType: 'CATEGORIZATION',
        targetId: transactionId,
        rating: 5,
        feedbackText: feedbackText || `User corrected category from ${transaction.category.name} to ${targetCategory.name}`,
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

/**
 * List all categories (system-defined + user custom categories)
 */
const getCategories = async (userId, type) => {
  const where = {
    OR: [{ userId: null }, { userId }],
    isActive: true,
  };

  if (type) {
    where.categoryType = type.toUpperCase();
  }

  return await prisma.category.findMany({
    where,
    orderBy: [
      { userId: 'desc' }, // Custom categories first
      { name: 'asc' },
    ],
  });
};

/**
 * Create a user-defined custom category
 */
const createCustomCategory = async (userId, data) => {
  const { name, categoryType = 'EXPENSE', icon = 'tag', colorHex = '#3B82F6', parentId } = data;

  // Check name uniqueness for this user
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

/**
 * Get categorization audit history for a specific transaction
 */
const getTransactionCategorizationHistory = async (userId, transactionId) => {
  // Ensure user owns transaction
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

module.exports = {
  predictCategory,
  recordCategorizationLog,
  correctTransactionCategory,
  getCategories,
  createCustomCategory,
  getTransactionCategorizationHistory,
  SYSTEM_KEYWORD_RULES,
};

