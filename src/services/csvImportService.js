const crypto = require('crypto');
const { Readable } = require('stream');
const csvParser = require('csv-parser');
const prisma = require('../config/prisma');
const { normalizeMerchantName } = require('./transactionService');
const { predictCategory, recordCategorizationLog } = require('./categorizationService');

/**
 * Common column name mappings from bank statement CSV formats
 */
const DATE_COLUMNS = ['date', 'txn date', 'transaction date', 'posting date', 'value date', 'txndate', 'valuedate'];
const DESC_COLUMNS = ['description', 'narration', 'particulars', 'remarks', 'transaction details', 'details', 'memo'];
const DEBIT_COLUMNS = ['debit', 'withdrawal', 'dr', 'dr amount', 'dr.', 'debit amount', 'withdrawal amount (inr)', 'withdrawal amt'];
const CREDIT_COLUMNS = ['credit', 'deposit', 'cr', 'cr amount', 'cr.', 'credit amount', 'deposit amount (inr)', 'deposit amt'];
const AMOUNT_COLUMNS = ['amount', 'txn amount', 'transaction amount'];
const TYPE_COLUMNS = ['type', 'transaction type', 'cr/dr', 'd/c'];
const REF_COLUMNS = ['txn no.', 'txn no', 'ref no', 'reference', 'reference no', 'chq/ref no', 'cheque no', 'utr', 'transaction id'];

/**
 * Match a header name against candidate column names
 */
const findMatchingField = (headers, candidateList) => {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  for (const candidate of candidateList) {
    const idx = normalized.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  return null;
};

/**
 * Parse date strings in common formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY)
 */
const parseStatementDate = (dateStr) => {
  if (!dateStr) return null;
  const cleanStr = String(dateStr).trim();

  // Check ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleanStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback native parse
  const d = new Date(cleanStr);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Clean numeric amounts (removes commas, currency signs, etc.)
 */
const cleanAmount = (amtStr) => {
  if (amtStr === undefined || amtStr === null) return 0;
  const clean = String(amtStr).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : Math.abs(parsed);
};

/**
 * Parse CSV buffer into structured rows.
 * Automatically skips preamble metadata lines (common in Indian bank statements like PNB, SBI, HDFC)
 * to locate the actual transaction table header.
 */
const parseCsvBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    // 1. Detect and strip preamble lines if table header starts further down
    const text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/);
    const headerCandidates = [
      'date', 'txn date', 'amount', 'dr amount', 'cr amount', 'debit', 'credit',
      'description', 'narration', 'particulars', 'balance', 'txn no'
    ];

    let tableStartIndex = 0;
    for (let i = 0; i < Math.min(lines.length, 60); i++) {
      const lower = lines[i].toLowerCase();
      const matched = headerCandidates.filter((c) => lower.includes(c));
      if (matched.length >= 2) {
        tableStartIndex = i;
        break;
      }
    }

    const cleanedBuffer = tableStartIndex > 0
      ? Buffer.from(lines.slice(tableStartIndex).join('\n'))
      : buffer;

    const results = [];
    const stream = Readable.from(cleanedBuffer);

    stream
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => header ? header.trim() : header,
          skipEmptyLines: true,
        })
      )
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

/**
 * Process a CSV Bank Statement file
 * 
 * @param {string} userId
 * @param {string} sourceId - The DataSource UUID
 * @param {Buffer} fileBuffer
 * @param {string} originalFileName
 */
const processCsvImport = async (userId, sourceId, fileBuffer, originalFileName) => {
  // 1. Verify DataSource and get associated FinancialAccount
  const dataSource = await prisma.dataSource.findFirst({
    where: { id: sourceId, userId, isActive: true },
    include: { account: true },
  });

  if (!dataSource) {
    const error = new Error('Data source not found or inactive');
    error.statusCode = 404;
    throw error;
  }

  if (!dataSource.account) {
    const error = new Error('No financial account linked to this data source');
    error.statusCode = 400;
    throw error;
  }

  const accountId = dataSource.accountId;

  // 2. Compute file SHA-256 hash to detect file re-upload
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  const existingFileBatch = await prisma.importBatch.findFirst({
    where: { userId, fileHash },
  });

  if (existingFileBatch && existingFileBatch.status === 'COMPLETED') {
    return {
      batchId: existingFileBatch.id,
      status: 'COMPLETED',
      totalRecords: existingFileBatch.totalRecords,
      parsedRecords: existingFileBatch.parsedRecords,
      duplicateRecords: existingFileBatch.duplicateRecords,
      failedRecords: existingFileBatch.failedRecords,
      account: {
        id: dataSource.account.id,
        name: dataSource.account.accountName,
      },
      message: 'This statement file was already processed. Existing records retained.',
      errorSummary: [],
    };
  }

  // 3. Parse CSV rows
  let rawRows;
  try {
    rawRows = await parseCsvBuffer(fileBuffer);
  } catch (err) {
    const error = new Error(`CSV Parsing failed: ${err.message}`);
    error.statusCode = 400;
    throw error;
  }

  if (rawRows.length === 0) {
    const error = new Error('The uploaded CSV file is empty');
    error.statusCode = 400;
    throw error;
  }

  // 4. Detect CSV headers
  const headers = Object.keys(rawRows[0]);
  const dateCol = findMatchingField(headers, DATE_COLUMNS);
  const descCol = findMatchingField(headers, DESC_COLUMNS);
  const debitCol = findMatchingField(headers, DEBIT_COLUMNS);
  const creditCol = findMatchingField(headers, CREDIT_COLUMNS);
  const amountCol = findMatchingField(headers, AMOUNT_COLUMNS);
  const typeCol = findMatchingField(headers, TYPE_COLUMNS);
  const refCol = findMatchingField(headers, REF_COLUMNS);

  if (!dateCol || (!amountCol && !debitCol && !creditCol)) {
    const error = new Error(
      `Invalid CSV structure. Could not find date or amount columns. Found headers: ${headers.join(', ')}`
    );
    error.statusCode = 400;
    throw error;
  }

  // 5. Default Categories Cache
  const [expenseCat, incomeCat] = await Promise.all([
    prisma.category.findFirst({ where: { name: 'Miscellaneous Expense', userId: null } }),
    prisma.category.findFirst({ where: { name: 'Miscellaneous Income', userId: null } }),
  ]);

  // 6. Create Import Batch in PENDING state
  const batch = await prisma.importBatch.create({
    data: {
      userId,
      sourceId,
      batchReference: originalFileName,
      fileHash,
      status: 'PROCESSING',
      totalRecords: rawRows.length,
    },
  });

  let parsedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;
  const errors = [];
  const createdTransactions = [];
  let totalNetBalanceDelta = 0;

  // 7. Process each row
  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const rowNum = idx + 2; // Accounting for 1-based index & header

    try {
      const rawDate = row[dateCol];
      // Skip empty or bank disclaimer footer lines gracefully
      if (!rawDate || String(rawDate).trim() === '' || String(rawDate).includes('***') || String(rawDate).startsWith('1.')) {
        continue;
      }
      const parsedDate = parseStatementDate(rawDate);
      if (!parsedDate) {
        // If row has no valid date and no amount, treat as trailing metadata/footer line
        const hasAmount = (debitCol && cleanAmount(row[debitCol]) > 0) ||
                          (creditCol && cleanAmount(row[creditCol]) > 0) ||
                          (amountCol && cleanAmount(row[amountCol]) > 0);
        if (!hasAmount) continue;
        throw new Error(`Invalid or missing date: "${rawDate}"`);
      }

      const rawDesc = descCol ? row[descCol] : 'Imported Transaction';
      if (!rawDesc || !String(rawDesc).trim()) {
        throw new Error('Missing transaction description/narration');
      }

      // Determine amount and type (DEBIT / CREDIT)
      let type = 'DEBIT';
      let amount = 0;

      if (debitCol && creditCol) {
        const debitVal = cleanAmount(row[debitCol]);
        const creditVal = cleanAmount(row[creditCol]);

        if (debitVal > 0) {
          type = 'DEBIT';
          amount = debitVal;
        } else if (creditVal > 0) {
          type = 'CREDIT';
          amount = creditVal;
        } else {
          throw new Error('Both debit and credit amounts are zero or empty');
        }
      } else if (amountCol) {
        amount = cleanAmount(row[amountCol]);
        if (amount === 0) {
          throw new Error('Transaction amount is zero or empty');
        }

        if (typeCol && row[typeCol]) {
          const tVal = String(row[typeCol]).toLowerCase();
          type = tVal.includes('cr') || tVal.includes('credit') || tVal.includes('deposit') ? 'CREDIT' : 'DEBIT';
        } else {
          // If negative amount, treat as debit
          const rawNum = parseFloat(String(row[amountCol]).replace(/[^0-9.-]/g, ''));
          type = rawNum < 0 ? 'DEBIT' : 'DEBIT'; // Default debit for single positive column unless marked
        }
      }

      const cleanMerchant = normalizeMerchantName(rawDesc);
      const extRef = refCol && row[refCol] ? String(row[refCol]).trim() : null;

      // Compute content hash & reference hash for duplicate detection
      const rawContentStr = JSON.stringify(row);
      const contentHash = crypto.createHash('sha256').update(rawContentStr).digest('hex');

      const dateOnlyStr = parsedDate.toISOString().split('T')[0];
      const refHash = crypto
        .createHash('sha256')
        .update(`${accountId}|${amount.toFixed(2)}|${type}|${dateOnlyStr}|${cleanMerchant.toLowerCase()}`)
        .digest('hex');

      // Check for duplicate message or transaction
      // 1. Check if externalMessageId already exists under this source
      // 2. Check if transaction with same referenceHash exists in this account
      let existingRaw = null;
      if (extRef) {
        existingRaw = await prisma.rawMessage.findFirst({
          where: { sourceId, externalMessageId: extRef },
        });
      }

      const duplicateTxn = await prisma.transaction.findFirst({
        where: {
          accountId,
          deletedAt: null,
          OR: [
            { referenceHash: refHash },
            ...(extRef ? [{ externalReference: extRef }] : []),
          ],
        },
      });

      if (existingRaw || duplicateTxn) {
        duplicateCount++;
        // If it's a re-occurring externalMessageId, append batch suffix to avoid DB unique constraint crash
        const safeExternalId = existingRaw ? `${extRef}_dup_${batch.id.substring(0, 8)}` : extRef;
        await prisma.rawMessage.create({
          data: {
            batchId: batch.id,
            sourceId,
            userId,
            externalMessageId: safeExternalId,
            contentHash,
            sanitizedPreview: String(rawDesc).substring(0, 500),
            processingStatus: 'POTENTIAL_DUPLICATE',
            duplicateOfId: existingRaw ? existingRaw.id : null,
            rejectionReason: `Duplicate of ${duplicateTxn ? `transaction ${duplicateTxn.id}` : `message ${existingRaw.id}`}`,
          },
        });
        continue;
      }

      // Preserve raw message record
      const rawMsg = await prisma.rawMessage.create({
        data: {
          batchId: batch.id,
          sourceId,
          userId,
          externalMessageId: extRef,
          contentHash,
          sanitizedPreview: String(rawDesc).substring(0, 500),
          processingStatus: 'PARSED',
        },
      });

      // Intelligently predict category based on rule engine and past corrections
      const catPrediction = await predictCategory(userId, rawDesc, type);
      const categoryId = catPrediction.categoryId;

      // Create valid transaction
      const txn = await prisma.transaction.create({
        data: {
          userId,
          accountId,
          batchId: batch.id,
          rawMessageId: rawMsg.id,
          categoryId,
          amount,
          currency: dataSource.account.currency || 'INR',
          type,
          status: 'POSTED',
          duplicateStatus: 'NOT_DUPLICATE',
          merchantName: String(rawDesc).substring(0, 150),
          cleanMerchantName: cleanMerchant.substring(0, 150),
          description: String(rawDesc),
          transactionAt: parsedDate,
          postingDate: parsedDate,
          referenceHash: refHash,
          externalReference: extRef,
          isUserVerified: !catPrediction.isAmbiguous,
        },
      });

      // Record Categorization Log
      await recordCategorizationLog({
        transactionId: txn.id,
        categoryId,
        method: catPrediction.method,
        confidenceScore: catPrediction.confidenceScore,
      });

      createdTransactions.push(txn);
      parsedCount++;
      totalNetBalanceDelta += type === 'CREDIT' ? amount : -amount;
    } catch (rowError) {
      failedCount++;
      errors.push({ row: rowNum, error: rowError.message });
    }
  }

  // 8. Update Account Balance
  if (totalNetBalanceDelta !== 0) {
    await prisma.financialAccount.update({
      where: { id: accountId },
      data: {
        cachedBalance: {
          increment: totalNetBalanceDelta,
        },
        lastReconciledAt: new Date(),
      },
    });
  }

  // 9. Update Batch Status
  const finalStatus =
    failedCount === 0 && duplicateCount === 0
      ? 'COMPLETED'
      : parsedCount > 0
      ? 'PARTIALLY_FAILED'
      : 'FAILED';

  const updatedBatch = await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: finalStatus,
      parsedRecords: parsedCount,
      duplicateRecords: duplicateCount,
      failedRecords: failedCount,
      errorSummary: errors,
      completedAt: new Date(),
    },
  });

  return {
    batchId: updatedBatch.id,
    status: updatedBatch.status,
    totalRecords: rawRows.length,
    parsedRecords: parsedCount,
    duplicateRecords: duplicateCount,
    failedRecords: failedCount,
    account: {
      id: dataSource.account.id,
      name: dataSource.account.accountName,
    },
    errorSummary: errors,
  };
};

/**
 * Get user's import batches history
 */
const getImportBatches = async (userId) => {
  return await prisma.importBatch.findMany({
    where: { userId },
    include: {
      source: {
        select: {
          id: true,
          providerName: true,
          sourceType: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  processCsvImport,
  getImportBatches,
};
