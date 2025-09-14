import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import TransactionModal from '../components/TransactionModal';
import { transactionAPI } from '../services/api';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [filters, setFilters] = useState({
        type: '',
        category: '',
        startDate: '',
        endDate: '',
        search: '',
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });

    const [searchParams, setSearchParams] = useSearchParams();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Smart category options based on transaction type
    const categoryOptions = {
        expense: [
            'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
            'Healthcare', 'Education', 'Travel', 'Personal Care', 'Home & Garden',
            'Insurance', 'Taxes', 'Miscellaneous'
        ],
        income: [
            'Salary', 'Freelance', 'Business', 'Investment', 'Rental Income',
            'Dividend', 'Interest', 'Bonus', 'Gift', 'Other Income'
        ]
    };

    // Get all categories for filter dropdown
    const allCategories = [...categoryOptions.expense, ...categoryOptions.income];

    useEffect(() => {
        fetchTransactions();
    }, [filters, pagination.page, refreshTrigger]);

    const fetchTransactions = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...filters,
                sortBy: 'date',
                sortOrder: 'desc',
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const response = await transactionAPI.getTransactions(params);

            if (response.data && response.data.success) {
                // Backend returns { success: true, data: [...], pagination: {...} }
                const transactions = response.data.data || [];
                // Additional client-side sorting by transaction date to ensure correct order
                const sortedTransactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                setTransactions(sortedTransactions);
                setPagination(prev => ({
                    ...prev,
                    total: response.data.pagination?.total || 0,
                    totalPages: response.data.pagination?.pages || 0,
                }));
            } else {
                setTransactions([]);
                setPagination(prev => ({
                    ...prev,
                    total: 0,
                    totalPages: 0,
                }));
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions([]);
            setPagination(prev => ({
                ...prev,
                total: 0,
                totalPages: 0,
            }));
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, filters]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const handleAddTransaction = () => {
        setEditingTransaction(null);
        setShowModal(true);
    };

    const handleEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        setShowModal(true);
    };

    const handleDeleteTransaction = async (transactionId) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            try {
                await transactionAPI.deleteTransaction(transactionId);
                // Force refresh by updating trigger
                setRefreshTrigger(prev => prev + 1);
            } catch (error) {
                console.error('Error deleting transaction:', error);
                alert('Failed to delete transaction. Please try again.');
            }
        }
    };

    const handleModalClose = (shouldRefresh = false) => {
        setShowModal(false);
        setEditingTransaction(null);
        if (shouldRefresh) {
            // Force refresh by updating trigger
            setRefreshTrigger(prev => prev + 1);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getSmartCategories = () => {
        if (filters.type === 'expense') {
            return categoryOptions.expense;
        } else if (filters.type === 'income') {
            return categoryOptions.income;
        }
        return allCategories;
    };

    // Pagination helpers
    const getPageNumbers = () => {
        const pages = [];
        const totalPages = pagination.totalPages;
        const currentPage = pagination.page;
        const delta = 2; // Show 2 pages before and after current

        if (totalPages <= 7) {
            // Show all pages if 7 or fewer
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Smart pagination
            pages.push(1);

            if (currentPage > delta + 2) {
                pages.push('...');
            }

            const start = Math.max(2, currentPage - delta);
            const end = Math.min(totalPages - 1, currentPage + delta);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - delta - 1) {
                pages.push('...');
            }

            if (totalPages > 1) {
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <Layout>
            <div className="dashboard-header">
                <div className="header-left">
                    {/* Header content without the main heading */}
                </div>
                <button onClick={handleAddTransaction} className="btn-add-transaction">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Add Transaction</span>
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <h3 className="mb-4">Filters</h3>
                <div className="grid grid-cols-4 gap-4">
                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <select
                            className="form-select"
                            value={filters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <select
                            className="form-select"
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {getSmartCategories().map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Start Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">End Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Search</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by description..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                </div>
            </div>

            {/* Transactions List */}
            <div className="card">
                {isLoading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                    </div>
                ) : (transactions && transactions.length === 0) ? (
                    <div className="text-center p-6">
                        <p className="text-gray-600">No transactions found.</p>
                        <button onClick={handleAddTransaction} className="btn-add-first-transaction">
                            Add Your First Transaction
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Category</th>
                                        <th>Type</th>
                                        <th>Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions && transactions.map((transaction) => (
                                        <tr key={transaction._id}>
                                            <td>{formatDate(transaction.date)}</td>
                                            <td>{transaction.description}</td>
                                            <td>
                                                <span className="category-tag">
                                                    {transaction.category}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`type-badge ${transaction.type}`}
                                                    style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        backgroundColor: transaction.type === 'income'
                                                            ? '#f0fdf4' : '#fef2f2',
                                                        color: transaction.type === 'income'
                                                            ? 'var(--color-success)' : 'var(--color-danger)',
                                                    }}
                                                >
                                                    {transaction.type}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    style={{
                                                        color: transaction.type === 'income'
                                                            ? 'var(--color-success)'
                                                            : 'var(--color-danger)',
                                                        fontWeight: '600',
                                                    }}
                                                >
                                                    {transaction.type === 'income' ? '+' : '-'}
                                                    {formatCurrency(Math.abs(transaction.amount))}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        onClick={() => handleEditTransaction(transaction)}
                                                        className="action-btn edit-btn"
                                                        title="Edit Transaction"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M18.5 2.50023C18.8978 2.10243 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.10243 21.5 2.50023C21.8978 2.89804 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.10243 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTransaction(transaction._id)}
                                                        className="action-btn delete-btn"
                                                        title="Delete Transaction"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Smart Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="pagination-container">
                                <div className="pagination-info">
                                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
                                </div>
                                <div className="pagination">
                                    <button
                                        className="pagination-btn"
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    {getPageNumbers().map((page, index) => (
                                        page === '...' ? (
                                            <span key={index} className="pagination-ellipsis">...</span>
                                        ) : (
                                            <button
                                                key={page}
                                                className={`pagination-btn ${page === pagination.page ? 'active' : ''}`}
                                                onClick={() => handlePageChange(page)}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ))}

                                    <button
                                        className="pagination-btn"
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Transaction Modal */}
            {showModal && (
                <TransactionModal
                    transaction={editingTransaction}
                    onClose={handleModalClose}
                    categoryOptions={categoryOptions}
                />
            )}
        </Layout>
    );
};

export default Transactions;