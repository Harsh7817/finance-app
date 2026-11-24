/**
 * merchantExtractor.js
 * Extracts merchant/counterparty name and identifiers from raw bank transaction descriptions.
 * Reusable by both CSV import and future SMS parser.
 */

// UPI format: UPI/DR|CR/REFNO/PAYEE_NAME/BANK_CODE/UPI_ID
const UPI_PATTERN = /^UPI\/(DR|CR)\/(\d+)\/([^/]+)\/([A-Z0-9]+)\/?([^\s/][^\s]*)?/i;
// IMPS/NEFT/RTGS
const IMPS_PATTERN = /^(?:IMPS|NEFT|RTGS)[\/\-](\w+)[\/\-](.+)/i;
// POS
const POS_PATTERN = /^POS\s+(.+?)(?:\s+ON\s+\d|\s+AT\s+|\s*\d{2}\/\d{2})/i;
// ATM
const ATM_PATTERN = /^ATM[\/\-\s]/i;

// Known bank codes — not merchant names
const BANK_CODES = new Set([
  'SBIN', 'HDFC', 'ICIC', 'AXIS', 'YESB', 'KOTAK', 'IDFB', 'FINO',
  'PAYTM', 'PYTM', 'AIRP', 'BKID', 'CNRB', 'PUNB', 'UBIN', 'BARB',
  'MAHB', 'IOBA', 'VIJB', 'DCBL', 'FDRL', 'KVBL', 'CITI', 'HSBC',
  'SCBL', 'DBSS', 'KKBK', 'UTIB', 'RATN', 'RBLB', 'ALLA', 'ANDB',
  'CORP', 'DENA', 'ORBC', 'SYND', 'UCBA', 'VIJB', 'YESBANK',
]);

// Well-known merchants/brands that should not be treated as person names
const KNOWN_MERCHANTS = new Set([
  'rapido', 'uber', 'ola', 'zomato', 'swiggy', 'bigbasket', 'blinkit',
  'zepto', 'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho',
  'netflix', 'spotify', 'hotstar', 'bookmyshow', 'irctc', 'makemytrip',
  'goibibo', 'cleartrip', 'phonepe', 'googlepay', 'paytm', 'cred',
  'groww', 'zerodha', 'upstox', 'razorpay', 'instamojo', 'cashfree',
  'airtel', 'jio', 'vodafone', 'bsnl', 'tataplay', 'tata sky',
  'apollo', 'practo', 'medplus', 'pharmeasy', '1mg', 'netmeds',
  'dominos', 'mcdonald', 'kfc', 'subway', 'pizza hut', 'burger king',
  'starbucks', 'cafe coffee day', 'dunkin', 'baskin robbins', 'barbeque nation',
  'dmart', 'spencers', 'reliance fresh', 'more supermarket', 'nature basket',
  'instamart', 'dunzo', 'porter', 'pepperfry', 'urban company',
  'indigo', 'air india', 'spicejet', 'go first', 'vistara',
  'indian oil', 'iocl', 'hpcl', 'bpcl', 'shell', 'fastag',
  'bescom', 'tneb', 'bses', 'adani electricity',
  'coursera', 'udemy', 'byjus', 'unacademy', 'vedantu',
  'uber eats', 'swiggy genie', 'dunzo delivery',
]);

/**
 * Normalize a name for consistent matching:
 * lowercase, remove special chars, collapse whitespace
 */
const normalizeName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Heuristic: does this look like a person's name?
 * 2-4 purely alphabetic words NOT in KNOWN_MERCHANTS
 */
const looksLikePerson = (name) => {
  if (!name) return false;
  const normalized = normalizeName(name);
  if (KNOWN_MERCHANTS.has(normalized)) return false;
  const words = name.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return words.every((w) => /^[a-zA-Z]+$/.test(w));
};

/**
 * Extract merchant/counterparty info from a raw bank transaction description.
 * Returns a structured normalized object for the categorization engine.
 *
 * @param {string} rawDescription
 * @returns {{
 *   extractedName: string,
 *   normalizedName: string,
 *   counterpartyIdentifier: string|null,
 *   transactionDirection: 'DEBIT'|'CREDIT'|null,
 *   isMerchant: boolean,
 *   isAmbiguous: boolean,
 *   parseMethod: string,
 * }}
 */
const extractMerchantInfo = (rawDescription) => {
  if (!rawDescription || !rawDescription.trim()) {
    return {
      extractedName: 'Unknown',
      normalizedName: 'unknown',
      counterpartyIdentifier: null,
      transactionDirection: null,
      isMerchant: false,
      isAmbiguous: true,
      parseMethod: 'EMPTY',
    };
  }

  const desc = rawDescription.trim();

  // --- UPI Transaction ---
  const upiMatch = desc.match(UPI_PATTERN);
  if (upiMatch) {
    const direction = upiMatch[1].toUpperCase() === 'DR' ? 'DEBIT' : 'CREDIT';
    const payeeName = (upiMatch[3] || '').trim();
    const bankCode = (upiMatch[4] || '').trim().toUpperCase();
    // UPI ID is typically after the bank code, looks like word@bank
    const rawUpiId = (upiMatch[5] || '').trim();
    const upiId = rawUpiId && rawUpiId.includes('@') ? rawUpiId : null;

    // If payee name is a bank code, the real merchant was likely the sender
    const effectiveName = BANK_CODES.has(payeeName.toUpperCase()) ? (rawUpiId || payeeName) : payeeName;
    const normalizedPayee = normalizeName(effectiveName);
    const isKnownMerchant = KNOWN_MERCHANTS.has(normalizedPayee);
    const isPerson = looksLikePerson(effectiveName);
    const isMerchant = isKnownMerchant || (!isPerson && effectiveName.length > 0);

    return {
      extractedName: effectiveName || 'UPI Transaction',
      normalizedName: normalizedPayee || 'upi transaction',
      counterpartyIdentifier: upiId,
      transactionDirection: direction,
      isMerchant,
      isAmbiguous: isPerson, // Person names are inherently ambiguous
      parseMethod: 'UPI',
    };
  }

  // --- IMPS/NEFT/RTGS ---
  const impsMatch = desc.match(IMPS_PATTERN);
  if (impsMatch) {
    const payload = (impsMatch[2] || '').trim();
    const parts = payload.split(/[\/\-]/);
    // Find the most likely name part (non-numeric, meaningful length)
    const candidateName = parts.find((p) => p.trim().length > 2 && !/^\d+$/.test(p.trim())) || payload;
    const normalizedCandidate = normalizeName(candidateName.trim());
    const isMerchant = KNOWN_MERCHANTS.has(normalizedCandidate) && !looksLikePerson(candidateName.trim());

    return {
      extractedName: candidateName.trim(),
      normalizedName: normalizedCandidate,
      counterpartyIdentifier: impsMatch[1] || null,
      transactionDirection: null,
      isMerchant,
      isAmbiguous: !isMerchant,
      parseMethod: 'IMPS_NEFT_RTGS',
    };
  }

  // --- POS Transaction ---
  const posMatch = desc.match(POS_PATTERN);
  if (posMatch) {
    const merchantPart = (posMatch[1] || '').trim().substring(0, 100);
    const normalizedMerchant = normalizeName(merchantPart);
    return {
      extractedName: merchantPart,
      normalizedName: normalizedMerchant,
      counterpartyIdentifier: null,
      transactionDirection: 'DEBIT',
      isMerchant: true,
      isAmbiguous: false,
      parseMethod: 'POS',
    };
  }

  // --- ATM Withdrawal ---
  if (ATM_PATTERN.test(desc)) {
    return {
      extractedName: 'ATM Withdrawal',
      normalizedName: 'atm withdrawal',
      counterpartyIdentifier: null,
      transactionDirection: 'DEBIT',
      isMerchant: false,
      isAmbiguous: false,
      parseMethod: 'ATM',
    };
  }

  // --- Fallback: clean up the full description ---
  const cleaned = desc
    .replace(/^(POS|UPI|INF|IMPS|NEFT|RTGS|BIL|INB|VPS|ECOM|ATM)[\/-]/gi, '')
    .replace(/[^\w\s&.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);

  const normalizedFallback = normalizeName(cleaned);
  const isKnownMerchantFallback = KNOWN_MERCHANTS.has(normalizedFallback);
  const isPersonFallback = looksLikePerson(cleaned);

  return {
    extractedName: cleaned || 'Unknown',
    normalizedName: normalizedFallback || 'unknown',
    counterpartyIdentifier: null,
    transactionDirection: null,
    isMerchant: isKnownMerchantFallback,
    isAmbiguous: isPersonFallback || !isKnownMerchantFallback,
    parseMethod: 'FALLBACK',
  };
};

module.exports = { extractMerchantInfo, normalizeName, looksLikePerson, KNOWN_MERCHANTS, BANK_CODES };

