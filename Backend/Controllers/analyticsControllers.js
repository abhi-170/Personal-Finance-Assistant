import { getTransactionStats } from '../Repository/transactionRepository.js';

// Get comprehensive transaction analytics
export const getAnalytics = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate, type } = req.query;

        const filters = {
            startDate,
            endDate,
            type
        };

        const stats = await getTransactionStats(userId, filters);

        // Process data for easier frontend consumption
        const processedStats = {
            overview: {
                totalIncome: 0,
                totalExpenses: 0,
                netIncome: 0,
                transactionCount: 0
            },
            expensesByCategory: [],
            incomeByCategory: [],
            monthlyTrends: []
        };

        // Process overview statistics
        stats.overview.forEach(item => {
            if (item._id === 'income') {
                processedStats.overview.totalIncome = item.total;
            } else if (item._id === 'expense') {
                processedStats.overview.totalExpenses = item.total;
            }
            processedStats.overview.transactionCount += item.count;
        });

        processedStats.overview.netIncome =
            processedStats.overview.totalIncome - processedStats.overview.totalExpenses;

        // Process category statistics
        stats.categories.forEach(categoryGroup => {
            if (categoryGroup._id === 'expense') {
                processedStats.expensesByCategory = categoryGroup.categories
                    .sort((a, b) => b.total - a.total);
            } else if (categoryGroup._id === 'income') {
                processedStats.incomeByCategory = categoryGroup.categories
                    .sort((a, b) => b.total - a.total);
            }
        });

        // Process monthly trends
        const monthlyData = {};
        stats.monthly.forEach(item => {
            const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
            if (!monthlyData[key]) {
                monthlyData[key] = {
                    period: key,
                    year: item._id.year,
                    month: item._id.month,
                    income: 0,
                    expense: 0,
                    net: 0
                };
            }

            if (item._id.type === 'income') {
                monthlyData[key].income = item.total;
            } else if (item._id.type === 'expense') {
                monthlyData[key].expense = item.total;
            }
        });

        // Calculate net for each month and convert to array
        processedStats.monthlyTrends = Object.values(monthlyData).map(month => {
            month.net = month.income - month.expense;
            return month;
        }).sort((a, b) => `${a.year}-${a.month}`.localeCompare(`${b.year}-${b.month}`));

        res.status(200).json({
            success: true,
            message: 'Analytics retrieved successfully',
            data: processedStats
        });
    } catch (error) {
        next(error);
    }
};

// Get expenses by category (for pie charts)
export const getExpensesByCategory = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate } = req.query;

        const filters = {
            startDate,
            endDate,
            type: 'expense'
        };

        const stats = await getTransactionStats(userId, filters);

        let expensesByCategory = [];
        stats.categories.forEach(categoryGroup => {
            if (categoryGroup._id === 'expense') {
                expensesByCategory = categoryGroup.categories
                    .sort((a, b) => b.total - a.total);
            }
        });

        const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + cat.total, 0);

        // Add percentage calculation
        const categoriesWithPercentage = expensesByCategory.map(category => ({
            ...category,
            percentage: totalExpenses > 0 ? ((category.total / totalExpenses) * 100).toFixed(2) : 0
        }));

        res.status(200).json({
            success: true,
            message: 'Expenses by category retrieved successfully',
            data: {
                categories: categoriesWithPercentage,
                totalExpenses
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get income by category
export const getIncomeByCategory = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate } = req.query;

        const filters = {
            startDate,
            endDate,
            type: 'income'
        };

        const stats = await getTransactionStats(userId, filters);

        let incomeByCategory = [];
        stats.categories.forEach(categoryGroup => {
            if (categoryGroup._id === 'income') {
                incomeByCategory = categoryGroup.categories
                    .sort((a, b) => b.total - a.total);
            }
        });

        const totalIncome = incomeByCategory.reduce((sum, cat) => sum + cat.total, 0);

        // Add percentage calculation
        const categoriesWithPercentage = incomeByCategory.map(category => ({
            ...category,
            percentage: totalIncome > 0 ? ((category.total / totalIncome) * 100).toFixed(2) : 0
        }));

        res.status(200).json({
            success: true,
            message: 'Income by category retrieved successfully',
            data: {
                categories: categoriesWithPercentage,
                totalIncome
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get monthly trends for line charts
export const getMonthlyTrends = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate, type } = req.query;

        const filters = {
            startDate,
            endDate,
            type
        };

        const stats = await getTransactionStats(userId, filters);

        // Process monthly data
        const monthlyData = {};
        stats.monthly.forEach(item => {
            const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
            if (!monthlyData[key]) {
                monthlyData[key] = {
                    period: key,
                    year: item._id.year,
                    month: item._id.month,
                    monthName: new Date(item._id.year, item._id.month - 1).toLocaleString('default', { month: 'short' }),
                    income: 0,
                    expense: 0,
                    net: 0,
                    incomeCount: 0,
                    expenseCount: 0
                };
            }

            if (item._id.type === 'income') {
                monthlyData[key].income = item.total;
                monthlyData[key].incomeCount = item.count;
            } else if (item._id.type === 'expense') {
                monthlyData[key].expense = item.total;
                monthlyData[key].expenseCount = item.count;
            }
        });

        // Calculate net and convert to array
        const monthlyTrends = Object.values(monthlyData).map(month => {
            month.net = month.income - month.expense;
            month.totalCount = month.incomeCount + month.expenseCount;
            return month;
        }).sort((a, b) => `${a.year}-${a.month}`.localeCompare(`${b.year}-${b.month}`));

        res.status(200).json({
            success: true,
            message: 'Monthly trends retrieved successfully',
            data: monthlyTrends
        });
    } catch (error) {
        next(error);
    }
};

// Get summary statistics
export const getSummaryStats = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate } = req.query;

        const filters = {
            startDate,
            endDate
        };

        const stats = await getTransactionStats(userId, filters);

        const summary = {
            totalIncome: 0,
            totalExpenses: 0,
            netIncome: 0,
            totalTransactions: 0,
            averageIncome: 0,
            averageExpense: 0,
            topExpenseCategory: null,
            topIncomeCategory: null
        };

        // Process overview
        stats.overview.forEach(item => {
            if (item._id === 'income') {
                summary.totalIncome = item.total;
                summary.averageIncome = item.avgAmount;
            } else if (item._id === 'expense') {
                summary.totalExpenses = item.total;
                summary.averageExpense = item.avgAmount;
            }
            summary.totalTransactions += item.count;
        });

        summary.netIncome = summary.totalIncome - summary.totalExpenses;

        // Find top categories
        stats.categories.forEach(categoryGroup => {
            if (categoryGroup._id === 'expense' && categoryGroup.categories.length > 0) {
                summary.topExpenseCategory = categoryGroup.categories
                    .sort((a, b) => b.total - a.total)[0];
            } else if (categoryGroup._id === 'income' && categoryGroup.categories.length > 0) {
                summary.topIncomeCategory = categoryGroup.categories
                    .sort((a, b) => b.total - a.total)[0];
            }
        });

        res.status(200).json({
            success: true,
            message: 'Summary statistics retrieved successfully',
            data: summary
        });
    } catch (error) {
        next(error);
    }
};