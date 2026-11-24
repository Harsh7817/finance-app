/**
 * merchantRepository.js
 * Global merchant database lookup and seeding.
 * Manages the Merchant and MerchantAlias tables.
 */

const prisma = require('../config/prisma');
const { normalizeName } = require('./merchantExtractor');

/**
 * Normalize a merchant name for DB storage
 */
const normalizeForDb = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Look up a merchant in the global merchant database.
 * Search order: exact normalizedName -> alias -> partial prefix
 *
 * @param {string} normalizedName - Already normalized merchant name
 * @returns {Promise<Merchant|null>}
 */
const findGlobalMerchant = async (normalizedName) => {
  if (!normalizedName || normalizedName === 'unknown' || normalizedName.length < 2) return null;

  // 1. Exact match on normalized name
  const direct = await prisma.merchant.findFirst({
    where: { normalizedName },
    include: { defaultCategory: true },
  });
  if (direct) return direct;

  // 2. Alias match
  const aliasMatch = await prisma.merchantAlias.findFirst({
    where: { normalizedAlias: normalizedName },
    include: { merchant: { include: { defaultCategory: true } } },
  });
  if (aliasMatch) return aliasMatch.merchant;

  // 3. Partial match — first word of the input against merchant names
  //    (e.g., 'rapido cab' matches merchant 'rapido')
  const firstWord = normalizedName.split(' ')[0];
  if (firstWord.length >= 4) {
    const partialAlias = await prisma.merchantAlias.findFirst({
      where: { normalizedAlias: { startsWith: firstWord } },
      include: { merchant: { include: { defaultCategory: true } } },
    });
    if (partialAlias) return partialAlias.merchant;

    const partialDirect = await prisma.merchant.findFirst({
      where: { normalizedName: { startsWith: firstWord } },
      include: { defaultCategory: true },
    });
    if (partialDirect) return partialDirect;
  }

  return null;
};

/**
 * Seed the global merchant database with well-known Indian merchants.
 * Uses upsert to be fully idempotent — safe to run multiple times.
 */
const seedMerchants = async () => {
  const merchantData = [
    // Transportation
    { name: 'Rapido', category: 'Transportation', aliases: ['rapido cab', 'rapido bike', 'rapido auto', 'rapi do'] },
    { name: 'Uber', category: 'Transportation', aliases: ['uber cab', 'uber auto', 'uber moto', 'uber rent'] },
    { name: 'Ola', category: 'Transportation', aliases: ['ola cab', 'ola electric', 'ola auto', 'ani technologies'] },
    { name: 'IRCTC', category: 'Transportation', aliases: ['indian railway catering', 'irctc rail', 'indian railways', 'cris'] },
    { name: 'IndiGo', category: 'Transportation', aliases: ['indigo airlines', 'interglobe aviation', '6e'] },
    { name: 'Indian Oil', category: 'Transportation', aliases: ['iocl', 'hp petrol', 'hpcl', 'bpcl', 'indian oil corp', 'bharat petroleum', 'hindustan petroleum'] },
    { name: 'FASTag', category: 'Transportation', aliases: ['fastag recharge', 'nhai fastag', 'toll plaza', 'paytm fastag', 'axis bank fastag'] },
    { name: 'Ola Money', category: 'Transportation', aliases: ['olamoney', 'ola postpaid'] },

    // Food & Dining
    { name: 'Zomato', category: 'Food & Dining', aliases: ['zomato food', 'zomato order', 'zomato pro'] },
    { name: 'Swiggy', category: 'Food & Dining', aliases: ['swiggy food', 'swiggy order', 'swiggy genie', 'bundl technologies'] },
    { name: "McDonald's", category: 'Food & Dining', aliases: ['mcdonalds', 'mcdonald', 'mcds', 'mcd', 'hardcastle restaurants', 'connaught plaza'] },
    { name: "Domino's", category: 'Food & Dining', aliases: ['dominos pizza', 'dominos', 'jubilant foodworks', 'dominos delivery'] },
    { name: 'KFC', category: 'Food & Dining', aliases: ['kfc chicken', 'kentucky fried', 'yum restaurants', 'devyani'] },
    { name: 'Subway', category: 'Food & Dining', aliases: ['subway sandwich', 'subway restaurant'] },
    { name: 'Starbucks', category: 'Food & Dining', aliases: ['starbucks coffee', 'starbucks india', 'tata starbucks'] },
    { name: 'Burger King', category: 'Food & Dining', aliases: ['burger king india', 'bk', 'restaurant brands asia'] },
    { name: 'Pizza Hut', category: 'Food & Dining', aliases: ['pizza hut delivery', 'pizzahut', 'yum pizza'] },
    { name: 'Cafe Coffee Day', category: 'Food & Dining', aliases: ['coffee day', 'ccd', 'amalgamated bean'] },

    // Groceries
    { name: 'BigBasket', category: 'Groceries', aliases: ['bigbasket grocery', 'bb now', 'innovative retail concepts'] },
    { name: 'Blinkit', category: 'Groceries', aliases: ['blinkit grocery', 'grofers', 'blinkit delivery', 'grofers india'] },
    { name: 'Zepto', category: 'Groceries', aliases: ['zepto grocery', 'zepto delivery', 'kiranakart technologies'] },
    { name: 'DMart', category: 'Groceries', aliases: ['d mart', 'avenue supermarts', 'dmart ready'] },
    { name: "Spencer's", category: 'Groceries', aliases: ['spencers retail', 'spencers supermarket'] },
    { name: 'Instamart', category: 'Groceries', aliases: ['swiggy instamart', 'instamart delivery'] },

    // Shopping
    { name: 'Amazon', category: 'Shopping', aliases: ['amazon india', 'amazon.in', 'amazon pay', 'amazon prime', 'amazon seller'] },
    { name: 'Flipkart', category: 'Shopping', aliases: ['flipkart online', 'flipkart internet', 'fk mart', 'flipkart wholesale'] },
    { name: 'Myntra', category: 'Shopping', aliases: ['myntra fashion', 'myntra design'] },
    { name: 'Nykaa', category: 'Shopping', aliases: ['nykaa beauty', 'nykaa fashion', 'fss life sciences'] },
    { name: 'Ajio', category: 'Shopping', aliases: ['ajio fashion', 'reliance ajio', 'ajio.com'] },
    { name: 'Meesho', category: 'Shopping', aliases: ['meesho marketplace', 'fashnear technologies'] },
    { name: 'Croma', category: 'Shopping', aliases: ['croma electronics', 'tata croma', 'infiniti retail'] },
    { name: 'Reliance Digital', category: 'Shopping', aliases: ['reliance digital store', 'rdigital'] },

    // Entertainment
    { name: 'Netflix', category: 'Entertainment', aliases: ['netflix subscription', 'netflix.com', 'netflix india'] },
    { name: 'Spotify', category: 'Entertainment', aliases: ['spotify music', 'spotify premium', 'spotify india'] },
    { name: 'Disney+ Hotstar', category: 'Entertainment', aliases: ['hotstar', 'disney hotstar', 'star india', 'novi digital'] },
    { name: 'BookMyShow', category: 'Entertainment', aliases: ['book my show', 'bms', 'bigtree entertainment'] },
    { name: 'PVR', category: 'Entertainment', aliases: ['pvr cinemas', 'pvr inox', 'pvr pictures'] },
    { name: 'YouTube Premium', category: 'Entertainment', aliases: ['youtube', 'google youtube', 'google llc youtube'] },
    { name: 'Prime Video', category: 'Entertainment', aliases: ['amazon prime video', 'primevideo.com'] },
    { name: 'Sony LIV', category: 'Entertainment', aliases: ['sonyliv', 'sony pictures networks', 'spn'] },

    // Bills & Utilities
    { name: 'Airtel', category: 'Bills & Utilities', aliases: ['airtel broadband', 'airtel dth', 'airtel recharge', 'bharti airtel', 'airtel payments'] },
    { name: 'Jio', category: 'Bills & Utilities', aliases: ['jio recharge', 'reliance jio', 'jio fiber', 'jio broadband', 'rjil'] },
    { name: 'Vi', category: 'Bills & Utilities', aliases: ['vodafone idea', 'vi mobile', 'vi recharge'] },
    { name: 'Tata Play', category: 'Bills & Utilities', aliases: ['tataplay', 'tata sky', 'tata play dth'] },
    { name: 'BSNL', category: 'Bills & Utilities', aliases: ['bsnl broadband', 'bsnl recharge', 'bharat sanchar nigam'] },

    // Health & Wellness
    { name: 'Apollo Pharmacy', category: 'Health & Wellness', aliases: ['apollo pharmacy', 'apollo hospital', 'apollo medicals', 'apollo health'] },
    { name: 'MedPlus', category: 'Health & Wellness', aliases: ['medplus pharmacy', 'medplus health', 'medplus stores'] },
    { name: '1mg', category: 'Health & Wellness', aliases: ['tata 1mg', '1mg pharma', 'health on time'] },
    { name: 'PharmEasy', category: 'Health & Wellness', aliases: ['pharmeasy pharmacy', 'api holdings'] },
    { name: 'Netmeds', category: 'Health & Wellness', aliases: ['netmeds pharmacy', 'dadha pharma'] },
    { name: 'Cult.fit', category: 'Health & Wellness', aliases: ['cult fit', 'cure fit', 'mfine'] },

    // Travel
    { name: 'MakeMyTrip', category: 'Travel', aliases: ['makemytrip.com', 'mmt', 'makemytrip holidays'] },
    { name: 'Goibibo', category: 'Travel', aliases: ['goibibo.com', 'goibibo hotels'] },
    { name: 'ClearTrip', category: 'Travel', aliases: ['cleartrip.com', 'cleartrip flights'] },
    { name: 'Airbnb', category: 'Travel', aliases: ['airbnb stay', 'airbnb india'] },
    { name: 'OYO', category: 'Travel', aliases: ['oyo rooms', 'oyo hotels', 'oyo life'] },

    // Education
    { name: 'Coursera', category: 'Education', aliases: ['coursera online', 'coursera certificate'] },
    { name: 'Udemy', category: 'Education', aliases: ['udemy course', 'udemy online', 'benesse'] },
    { name: "BYJU'S", category: 'Education', aliases: ['byjus', 'byju s', 'think and learn'] },
    { name: 'Unacademy', category: 'Education', aliases: ['unacademy learning', 'sorting hat technologies'] },

    // Investment
    { name: 'Zerodha', category: 'Investment', aliases: ['zerodha kite', 'zerodha coin', 'zerodha broking'] },
    { name: 'Groww', category: 'Investment', aliases: ['groww mutual fund', 'groww sip', 'nextbillion technology'] },
    { name: 'Upstox', category: 'Investment', aliases: ['upstox pro', 'rksv securities'] },
    { name: 'CRED', category: 'Investment', aliases: ['cred app', 'dreamplug technologies', 'cred cashback'] },
  ];

  let seededCount = 0;
  for (const m of merchantData) {
    // Find the matching system category
    const cat = await prisma.category.findFirst({
      where: { name: m.category, userId: null, isActive: true },
    });
    if (!cat) {
      console.warn(`[MerchantSeed] Category not found: "${m.category}" for merchant "${m.name}". Skipping.`);
      continue;
    }

    const normalizedName = normalizeForDb(m.name);

    const merchant = await prisma.merchant.upsert({
      where: { normalizedName },
      update: { merchantName: m.name, defaultCategoryId: cat.id },
      create: { merchantName: m.name, normalizedName, defaultCategoryId: cat.id, isVerified: true },
    });

    for (const alias of (m.aliases || [])) {
      const normalizedAlias = normalizeForDb(alias);
      await prisma.merchantAlias.upsert({
        where: { normalizedAlias },
        update: { merchantId: merchant.id },
        create: { merchantId: merchant.id, alias, normalizedAlias },
      });
    }

    seededCount++;
  }
  console.log(`[MerchantSeed] Seeded ${seededCount}/${merchantData.length} merchants.`);
};

/**
 * List all merchants (admin use)
 */
const listMerchants = async ({ limit = 50, offset = 0 } = {}) => {
  return await prisma.merchant.findMany({
    include: { defaultCategory: { select: { id: true, name: true } }, aliases: true },
    orderBy: { merchantName: 'asc' },
    take: limit,
    skip: offset,
  });
};

module.exports = { findGlobalMerchant, seedMerchants, listMerchants, normalizeForDb };

