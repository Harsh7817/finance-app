const { errorResponse } = require('../utils/response');

const VALID_FORECAST_TYPES = ['TOTAL_EXPENDITURE', 'CATEGORY_EXPENDITURE', 'BUDGET_DEVIATION_RISK'];

/**
 * Validates request payload when recording a forecast snapshot
 */
const validateRecordForecast = (req, res, next) => {
  const {
    forecastType,
    targetPeriodStart,
    targetPeriodEnd,
    predictedAmount,
    inputWindowStart,
    inputWindowEnd,
    confidenceScore,
    riskProbability,
  } = req.body;

  const errors = [];

  if (forecastType && !VALID_FORECAST_TYPES.includes(forecastType)) {
    errors.push(`forecastType must be one of: ${VALID_FORECAST_TYPES.join(', ')}`);
  }

  if (!targetPeriodStart || isNaN(new Date(targetPeriodStart).getTime())) {
    errors.push('targetPeriodStart is required and must be a valid date');
  }

  if (!targetPeriodEnd || isNaN(new Date(targetPeriodEnd).getTime())) {
    errors.push('targetPeriodEnd is required and must be a valid date');
  }

  if (targetPeriodStart && targetPeriodEnd && new Date(targetPeriodStart) >= new Date(targetPeriodEnd)) {
    errors.push('targetPeriodStart must be earlier than targetPeriodEnd');
  }

  if (predictedAmount === undefined || isNaN(Number(predictedAmount)) || Number(predictedAmount) < 0) {
    errors.push('predictedAmount is required and must be a non-negative number');
  }

  if (!inputWindowStart || isNaN(new Date(inputWindowStart).getTime())) {
    errors.push('inputWindowStart is required and must be a valid date');
  }

  if (!inputWindowEnd || isNaN(new Date(inputWindowEnd).getTime())) {
    errors.push('inputWindowEnd is required and must be a valid date');
  }

  if (confidenceScore !== undefined && (isNaN(Number(confidenceScore)) || Number(confidenceScore) < 0 || Number(confidenceScore) > 1)) {
    errors.push('confidenceScore must be a number between 0 and 1');
  }

  if (riskProbability !== undefined && (isNaN(Number(riskProbability)) || Number(riskProbability) < 0 || Number(riskProbability) > 1)) {
    errors.push('riskProbability must be a number between 0 and 1');
  }

  if (errors.length > 0) {
    return errorResponse(res, {
      status: 400,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Validates query parameters for spending and forecasting endpoints
 */
const validateQueryOptions = (req, res, next) => {
  const { lookbackDays, year, month } = req.query;
  const errors = [];

  if (lookbackDays !== undefined) {
    const days = parseInt(lookbackDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      errors.push('lookbackDays must be an integer between 1 and 365');
    }
  }

  if (year !== undefined) {
    const y = parseInt(year, 10);
    if (isNaN(y) || y < 2000 || y > 2100) {
      errors.push('year must be a valid four-digit year');
    }
  }

  if (month !== undefined) {
    const m = parseInt(month, 10);
    if (isNaN(m) || m < 1 || m > 12) {
      errors.push('month must be an integer between 1 and 12');
    }
  }

  if (errors.length > 0) {
    return errorResponse(res, {
      status: 400,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

module.exports = {
  validateRecordForecast,
  validateQueryOptions,
};

