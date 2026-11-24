const multer = require('multer');

// Store uploaded files in memory buffer for quick parsing and SHA-256 calculation
const storage = multer.memoryStorage();

// File filter: accept only text/csv or .csv extensions
const fileFilter = (req, file, cb) => {
  const isCsvExtension = file.originalname && file.originalname.toLowerCase().endsWith('.csv');
  const isCsvMime = !file.mimetype ||
                    file.mimetype === 'text/csv' || 
                    file.mimetype === 'application/vnd.ms-excel' || 
                    file.mimetype === 'application/csv' ||
                    file.mimetype === 'text/plain' ||
                    file.mimetype === 'application/octet-stream' ||
                    file.mimetype === '*/*';

  if (isCsvExtension || isCsvMime) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only CSV statement files (.csv) are allowed.');
    error.statusCode = 400;
    cb(error, false);
  }
};

const uploadCsv = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});

module.exports = uploadCsv;

