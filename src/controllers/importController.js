const { processCsvImport, getImportBatches } = require('../services/csvImportService');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Controller to upload and parse CSV bank statement
 */
const importCsvStatement = async (req, res, next) => {
  try {
    let fileBuffer;
    let originalName = 'statement.csv';

    if (req.file) {
      fileBuffer = req.file.buffer;
      originalName = req.file.originalname;
    } else if (req.body && req.body.csvContent) {
      fileBuffer = Buffer.from(req.body.csvContent, 'utf8');
      originalName = req.body.fileName || 'statement.csv';
    } else {
      return errorResponse(res, {
        status: 400,
        message: 'No CSV file or content provided. Please upload a file with key "file" or provide "csvContent" in JSON.',
      });
    }

    const { sourceId } = req.body;
    if (!sourceId) {
      return errorResponse(res, {
        status: 400,
        message: 'sourceId is required to link the imported file to a DataSource',
      });
    }

    const result = await processCsvImport(
      req.user.id,
      sourceId,
      fileBuffer,
      originalName
    );

    return successResponse(res, {
      status: 201,
      message: 'CSV statement processed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to list import batches history
 */
const listImportBatches = async (req, res, next) => {
  try {
    const batches = await getImportBatches(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Import batches retrieved successfully',
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importCsvStatement,
  listImportBatches,
};

