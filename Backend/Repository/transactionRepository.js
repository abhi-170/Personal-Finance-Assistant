import Transaction from '../Models/Transaction.js';

// Create a new transaction
export const saveTransactionToDB = async (transactionData) => {
    try {
        const transaction = new Transaction(transactionData);
        return await transaction.save();
    } catch (error) {
        throw new Error(`Error creating transaction: ${error.message}`);
    }
};

// Get transactions with pagination and filtering
export const getTransactionsByUserId = async (userId, filters = {}, options = {}) => {
    try {
        const {
            type,
            category,
            startDate,
            endDate,
            page = 1,
            limit = 10,
            sortBy = '-date'
        } = { ...filters, ...options };

        // Build query
        const query = { userId };

        if (type && type !== 'all') {
            query.type = type;
        }

        if (category) {
            query.category = { $regex: category, $options: 'i' };
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Execute query with pagination
        const transactions = await Transaction.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const total = await Transaction.countDocuments(query);

        return {
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        throw new Error(`Error fetching transactions: ${error.message}`);
    }
};

// Get transaction by ID and user ID
export const getTransactionById = async (transactionId, userId) => {
    try {
        return await Transaction.findOne({ _id: transactionId, userId });
    } catch (error) {
        throw new Error(`Error fetching transaction: ${error.message}`);
    }
};

// Update transaction
export const updateTransactionById = async (transactionId, userId, updateData) => {
    try {
        return await Transaction.findOneAndUpdate(
            { _id: transactionId, userId },
            updateData,
            { new: true, runValidators: true }
        );
    } catch (error) {
        throw new Error(`Error updating transaction: ${error.message}`);
    }
};

// Delete transaction
export const deleteTransactionById = async (transactionId, userId) => {
    try {
        return await Transaction.findOneAndDelete({ _id: transactionId, userId });
    } catch (error) {
        throw new Error(`Error deleting transaction: ${error.message}`);
    }
};

// Get transaction statistics for analytics
export const getTransactionStats = async (userId, filters = {}) => {
    try {
        const { startDate, endDate, type } = filters;

        // Build match query
        const matchQuery = { userId };

        if (type && type !== 'all') {
            matchQuery.type = type;
        }

        if (startDate || endDate) {
            matchQuery.date = {};
            if (startDate) matchQuery.date.$gte = new Date(startDate);
            if (endDate) matchQuery.date.$lte = new Date(endDate);
        }

        // Aggregate statistics
        const stats = await Transaction.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                    avgAmount: { $avg: '$amount' }
                }
            }
        ]);

        // Get category breakdown
        const categoryStats = await Transaction.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { type: '$type', category: '$category' },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.type',
                    categories: {
                        $push: {
                            category: '$_id.category',
                            total: '$total',
                            count: '$count'
                        }
                    }
                }
            }
        ]);

        // Get monthly breakdown
        const monthlyStats = await Transaction.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                        type: '$type'
                    },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        return {
            overview: stats,
            categories: categoryStats,
            monthly: monthlyStats
        };
    } catch (error) {
        throw new Error(`Error fetching transaction stats: ${error.message}`);
    }
};

// Get categories for a user
export const getUserCategories = async (userId, type = null) => {
    try {
        const matchQuery = { userId };
        if (type) {
            matchQuery.type = type;
        }

        return await Transaction.distinct('category', matchQuery);
    } catch (error) {
        throw new Error(`Error fetching categories: ${error.message}`);
    }
};