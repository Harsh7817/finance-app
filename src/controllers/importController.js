const { processCsvImport, getImportBatches } = require('../services/csvImportService');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Controller to upload and parse CSV bank statement
 */
const importCsvStatement = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, {
        status: 400,
        message: 'No CSV file uploaded. Please provide a file with key "file".',
      });
    }

    const { sourceId } = req.body;
    if (!sourceId) {
      return errorResponse(res, {
        status: 400,
        message: 'sourceId is required in form-data to link the imported file to a DataSource',
      });
    }

    const result = await processCsvImport(
      req.user.id,
      sourceId,
      req.file.buffer,
      req.file.originalname
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

