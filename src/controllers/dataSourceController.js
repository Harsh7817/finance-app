const {
  createDataSource,
  getUserDataSources,
  getDataSourceById,
  updateDataSource,
  createFinancialAccount,
  getUserAccounts,
} = require('../services/dataSourceService');
const { successResponse } = require('../utils/response');

/**
 * Controller to create a new Data Source
 */
const addDataSource = async (req, res, next) => {
  try {
    const dataSource = await createDataSource(req.user.id, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Data source registered successfully',
      data: dataSource,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to list all user data sources
 */
const listDataSources = async (req, res, next) => {
  try {
    const { isActive, sourceType } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (sourceType) filter.sourceType = sourceType;

    const dataSources = await getUserDataSources(req.user.id, filter);
    return successResponse(res, {
      status: 200,
      message: 'Data sources retrieved successfully',
      data: dataSources,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get single data source by ID
 */
const getDataSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dataSource = await getDataSourceById(req.user.id, id);
    return successResponse(res, {
      status: 200,
      message: 'Data source retrieved successfully',
      data: dataSource,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update data source
 */
const modifyDataSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateDataSource(req.user.id, id, req.body);
    return successResponse(res, {
      status: 200,
      message: 'Data source updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for optional manual financial account creation
 */
const addAccount = async (req, res, next) => {
  try {
    const account = await createFinancialAccount(req.user.id, req.body);
    return successResponse(res, {
      status: 201,
      message: 'Financial account created successfully',
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to list all financial accounts
 */
const listAccounts = async (req, res, next) => {
  try {
    const accounts = await getUserAccounts(req.user.id);
    return successResponse(res, {
      status: 200,
      message: 'Financial accounts retrieved successfully',
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addDataSource,
  listDataSources,
  getDataSource,
  modifyDataSource,
  addAccount,
  listAccounts,
};

