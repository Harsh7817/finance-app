const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const prisma = require('./config/prisma');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const consentRoutes = require('./routes/consentRoutes');
const dataSourceRoutes = require('./routes/dataSourceRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const importRoutes = require('./routes/importRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const goalRoutes = require('./routes/goalRoutes');
const recurringRoutes = require('./routes/recurringRoutes');
const categorizationRoutes = require('./routes/categorizationRoutes');
const { successResponse, errorResponse } = require('./utils/response');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Enable CORS
app.use(cors());

// Parse JSON request body
app.use(express.json({ limit: '10mb' }));

// Parse url-encoded request body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Health-check endpoint
 * Checks both application state and database connectivity
 */
app.get('/health', async (req, res) => {
  try {
    // Check PostgreSQL connection via Prisma
    await prisma.$queryRaw`SELECT 1`;

    return successResponse(res, {
      status: 200,
      message: 'System is healthy',
      data: {
        uptime: process.uptime(),
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, {
      status: 503,
      message: 'Service unavailable: database connectivity check failed',
      errors: process.env.NODE_ENV !== 'production' ? error.message : null,
    });
  }
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/consents', consentRoutes);
app.use('/api/v1/financial', dataSourceRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/imports', importRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/recurring', recurringRoutes);
app.use('/api/v1/categorization', categorizationRoutes);

// 404 Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
