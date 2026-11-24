const express = require('express');
const uploadCsv = require('../middlewares/uploadMiddleware');
const { importCsvStatement, listImportBatches } = require('../controllers/importController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Require authentication for all statement imports
router.use(authenticate);

const handleCsvUpload = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    return uploadCsv.single('file')(req, res, next);
  }
  next();
};

/**
 * @route   POST /api/v1/imports/csv
 * @desc    Upload and process a CSV bank statement (supports multipart form-data or JSON with csvContent)
 * @access  Protected
 */
router.post('/csv', handleCsvUpload, importCsvStatement);

/**
 * @route   GET /api/v1/imports/batches
 * @desc    Get import batches history
 * @access  Protected
 */
router.get('/batches', listImportBatches);

module.exports = router;

