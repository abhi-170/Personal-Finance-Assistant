import express from 'express';
import {
    getAnalytics,
    getExpensesByCategory,
    getIncomeByCategory,
    getMonthlyTrends,
    getSummaryStats
} from '../Controllers/analyticsControllers.js';
import protectRoute from '../Middlewares/authMiddleware.js';

const router = express.Router();

// All analytics routes require authentication
router.use(protectRoute);

// Get comprehensive analytics
router.get('/', getAnalytics);

// Get summary statistics
router.get('/summary', getSummaryStats);

// Get expenses by category (for pie charts)
router.get('/expenses/categories', getExpensesByCategory);

// Get income by category
router.get('/income/categories', getIncomeByCategory);

// Get monthly trends (for line charts)
router.get('/trends/monthly', getMonthlyTrends);

export default router;