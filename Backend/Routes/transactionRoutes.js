import express from 'express';
import {
    createTransaction,
    getTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction,
    getCategories,
    bulkCreateTransactions,
    migrateTransactionSources
} from '../Controllers/transactionControllers.js';
import protectRoute from '../Middlewares/authMiddleware.js';
import {
    validateTransaction,
    validateTransactionUpdate,
    validateBulkTransactions,
    validateTransactionQuery
} from '../Middlewares/transactionValidation.js';

const router = express.Router();

// All transaction routes require authentication
router.use(protectRoute);

// Create new transaction
router.post('/', validateTransaction, createTransaction);

// Get all transactions with filtering and pagination
router.get('/', validateTransactionQuery, getTransactions);

// Get user's categories
router.get('/categories', getCategories);

// Migrate existing transactions to add source field
router.post('/migrate-sources', migrateTransactionSources);

// Bulk create transactions
router.post('/bulk', validateBulkTransactions, bulkCreateTransactions);

// Get single transaction
router.get('/:id', getTransaction);

// Update transaction
router.put('/:id', validateTransactionUpdate, updateTransaction);

// Delete transaction
router.delete('/:id', deleteTransaction);

export default router;