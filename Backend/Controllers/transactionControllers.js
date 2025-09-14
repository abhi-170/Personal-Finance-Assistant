import {
    saveTransactionToDB,
    getTransactionsByUserId,
    getTransactionById,
    updateTransactionById,
    deleteTransactionById,
    getUserCategories
} from '../Repository/transactionRepository.js';

// Helper function to convert period to date range
const getPeriodDateRange = (period) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (period) {
        case 'current_month':
            return {
                startDate: new Date(currentYear, currentMonth, 1),
                endDate: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
            };
        case 'last_month':
            return {
                startDate: new Date(currentYear, currentMonth - 1, 1),
                endDate: new Date(currentYear, currentMonth, 0, 23, 59, 59)
            };
        case 'current_year':
            return {
                startDate: new Date(currentYear, 0, 1),
                endDate: new Date(currentYear, 11, 31, 23, 59, 59)
            };
        case 'last_year':
            return {
                startDate: new Date(currentYear - 1, 0, 1),
                endDate: new Date(currentYear - 1, 11, 31, 23, 59, 59)
            };
        default:
            return { startDate: null, endDate: null };
    }
};

// Create new transaction
export const createTransaction = async (req, res, next) => {
    try {
        const { type, category, amount, date, description } = req.body;
        const userId = req.user._id;

        const transactionData = {
            userId,
            type,
            category,
            amount: parseFloat(amount),
            date: new Date(date),
            description: description || ''
        };

        const transaction = await saveTransactionToDB(transactionData);

        res.status(201).json({
            success: true,
            message: 'Transaction created successfully',
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};

// Get transactions with pagination and filtering
export const getTransactions = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const {
            type,
            category,
            startDate,
            endDate,
            description,
            period,
            page = 1,
            limit = 10,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        let filters = {
            type,
            category,
            startDate,
            endDate,
            description
        };

        // If period is provided, override startDate and endDate
        if (period) {
            const periodDates = getPeriodDateRange(period);
            filters.startDate = periodDates.startDate;
            filters.endDate = periodDates.endDate;
        }

        // Construct sort string based on sortBy and sortOrder
        const sortString = sortOrder === 'desc' ? `-${sortBy}` : sortBy;

        const options = {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 1000), // Allow up to 1000 for analytics
            sortBy: sortString
        };

        const result = await getTransactionsByUserId(userId, filters, options);

        res.status(200).json({
            success: true,
            message: 'Transactions retrieved successfully',
            data: result.transactions,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

// Get single transaction
export const getTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const transaction = await getTransactionById(id, userId);

        if (!transaction) {
            res.status(404);
            throw new Error('Transaction not found');
        }

        res.status(200).json({
            success: true,
            message: 'Transaction retrieved successfully',
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};

// Update transaction
export const updateTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const updateData = req.body;

        // Convert amount to number if provided
        if (updateData.amount) {
            updateData.amount = parseFloat(updateData.amount);
        }

        // Convert date if provided
        if (updateData.date) {
            updateData.date = new Date(updateData.date);
        }

        const transaction = await updateTransactionById(id, userId, updateData);

        if (!transaction) {
            res.status(404);
            throw new Error('Transaction not found');
        }

        res.status(200).json({
            success: true,
            message: 'Transaction updated successfully',
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};

// Delete transaction
export const deleteTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const transaction = await deleteTransactionById(id, userId);

        if (!transaction) {
            res.status(404);
            throw new Error('Transaction not found');
        }

        res.status(200).json({
            success: true,
            message: 'Transaction deleted successfully',
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};

// Get user's categories
export const getCategories = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { type } = req.query;

        const categories = await getUserCategories(userId, type);

        res.status(200).json({
            success: true,
            message: 'Categories retrieved successfully',
            data: categories
        });
    } catch (error) {
        next(error);
    }
};

// Bulk create transactions (useful for receipt processing)
export const bulkCreateTransactions = async (req, res, next) => {
    try {
        const { transactions } = req.body;
        const userId = req.user._id;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            res.status(400);
            throw new Error('Please provide an array of transactions');
        }

        const createdTransactions = [];
        const errors = [];

        for (let i = 0; i < transactions.length; i++) {
            try {
                const transactionData = {
                    ...transactions[i],
                    userId,
                    amount: parseFloat(transactions[i].amount),
                    date: new Date(transactions[i].date)
                };

                const transaction = await saveTransactionToDB(transactionData);
                createdTransactions.push(transaction);
            } catch (error) {
                errors.push({
                    index: i,
                    error: error.message,
                    transaction: transactions[i]
                });
            }
        }

        res.status(201).json({
            success: true,
            message: `${createdTransactions.length} transactions created successfully`,
            data: {
                created: createdTransactions,
                errors: errors
            }
        });
    } catch (error) {
        next(error);
    }
};