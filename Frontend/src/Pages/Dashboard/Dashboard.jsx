import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../Components/Layout.jsx';
import TransactionModal from '../../Components/TransactionModal.jsx';
import { transactionAPI, analyticsAPI } from '../../Services/api.js';
import { testBackendConnection, testAPIConnection } from '../../Utils/connectionTest.js';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        transactionCount: 0,
    });
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState(null);

    // Smart category options for the modal
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

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Add refresh function for modal callbacks
    const refreshDashboard = () => {
        fetchDashboardData();
    };

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Test network connection first
            console.log('Attempting to fetch dashboard data...');
            console.log('API Base URL:', import.meta.env.REACT_APP_API_URL || 'http://localhost:8080/api');

            // Test backend connection first
            const backendConnected = await testBackendConnection();
            if (!backendConnected) {
                setError('Backend server is not running on port 8080. Please start the backend server.');
                return;
            }

            const apiConnected = await testAPIConnection();
            if (!apiConnected) {
                setError('API endpoints are not accessible. Please check backend configuration.');
                return;
            }

            // Fetch analytics summary
            const summaryResponse = await analyticsAPI.getSummary();
            console.log('Analytics summary response:', summaryResponse.data);

            if (summaryResponse.data.success) {
                const summary = summaryResponse.data.data;
                setStats({
                    totalIncome: summary.totalIncome || 0,
                    totalExpenses: summary.totalExpenses || 0,
                    balance: summary.netIncome || 0,
                    transactionCount: summary.totalTransactions || 0,
                });
            } else {
                console.error('Analytics API returned unsuccessful response:', summaryResponse.data);
                setError('Failed to load analytics data');
            }

            // Fetch current month transactions count
            const currentDate = new Date();
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const currentMonthResponse = await transactionAPI.getTransactions({
                startDate: startOfMonth.toISOString().split('T')[0],
                endDate: endOfMonth.toISOString().split('T')[0],
                limit: 1000, // Large limit to get count
            });

            let currentMonthCount = 0;
            if (currentMonthResponse.data.success) {
                currentMonthCount = currentMonthResponse.data.pagination?.total || currentMonthResponse.data.data?.length || 0;
            }

            // Fetch recent transactions (limit to 4, sorted by transaction date)
            const transactionsResponse = await transactionAPI.getTransactions({
                page: 1,
                limit: 4,
                sortBy: 'date',
                sortOrder: 'desc'
            });

            if (transactionsResponse.data.success) {
                const transactions = transactionsResponse.data.data || [];
                // Additional client-side sorting by transaction date to ensure correct order
                const sortedTransactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                setRecentTransactions(sortedTransactions);
            }

            // Update stats with current month count
            setStats(prev => ({
                ...prev,
                transactionCount: currentMonthCount
            }));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            console.error('Error details:', error.response?.data || error.message);

            // Check if it's an authentication error
            if (error.response?.status === 401) {
                console.error('Authentication error - token may be invalid');
                setError('Authentication failed. Please log in again.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Don't redirect here, let the axios interceptor handle it
            } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
                setError('Unable to connect to server. Please check if the backend is running on port 8080.');
            } else {
                setError('Failed to load dashboard data. Please try again.');
            }

            // Set default values on error
            setStats({
                totalIncome: 0,
                totalExpenses: 0,
                balance: 0,
                transactionCount: 0,
            });
            setRecentTransactions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddTransaction = () => {
        setShowModal(true);
    };

    const handleModalClose = (shouldRefresh = false) => {
        setShowModal(false);
        if (shouldRefresh) {
            fetchDashboardData(); // Refresh dashboard data when transaction is added
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

    if (isLoading) {
        return (
            <Layout>
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="dashboard-header">
                <h1>Dashboard</h1>
                <button onClick={handleAddTransaction} className="btn btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                        <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Add Transaction
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="card" style={{ backgroundColor: '#fee', border: '1px solid #fcc', marginBottom: '1rem' }}>
                    <div style={{ color: '#c33', padding: '1rem' }}>
                        <strong>Error:</strong> {error}
                        <button
                            onClick={fetchDashboardData}
                            style={{ marginLeft: '1rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                            className="btn btn-secondary"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {formatCurrency(stats.totalIncome)}
                    </div>
                    <div className="stat-label">Total Income</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
                        {formatCurrency(stats.totalExpenses)}
                    </div>
                    <div className="stat-label">Total Expenses</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value" style={{
                        color: stats.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                        {formatCurrency(stats.balance)}
                    </div>
                    <div className="stat-label">Net Balance</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">
                        {stats.transactionCount}
                    </div>
                    <div className="stat-label">This Month</div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2>Recent Transactions</h2>
                    <Link to="/transactions" className="btn btn-secondary">
                        View All
                    </Link>
                </div>

                {recentTransactions.length === 0 ? (
                    <div className="text-center p-6">
                        <p className="text-gray-600">No transactions yet.</p>
                        <button onClick={handleAddTransaction} className="btn btn-primary mt-3">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                                <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Add Your First Transaction
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.map((transaction) => (
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 mt-6">
                <div className="card text-center">
                    <h3 className="mb-3">Quick Actions</h3>
                    <div className="flex flex-col gap-3">
                        <button onClick={handleAddTransaction} className="btn btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                                <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Add Transaction
                        </button>
                        <Link to="/receipts" className="btn btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Upload Receipt
                        </Link>
                    </div>
                </div>

                <div className="card text-center">
                    <h3 className="mb-3">Insights</h3>
                    <div className="flex flex-col gap-3">
                        <Link to="/analytics" className="btn btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                                <path d="M21 21H4.6C4.26863 21 4 20.7314 4 20.4V3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M9 12L13 8L17 12L21 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            View Analytics
                        </Link>
                        <Link to="/transactions" className="btn btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                                <path d="M12 1V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6312 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6312 13.6815 18 14.5717 18 15.5C18 16.4283 17.6312 17.3185 16.9749 17.9749C16.3185 18.6312 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Manage Transactions
                        </Link>
                    </div>
                </div>
            </div>

            {/* Transaction Modal */}
            {showModal && (
                <TransactionModal
                    transaction={null}
                    onClose={handleModalClose}
                    categoryOptions={categoryOptions}
                />
            )}
        </Layout>
    );
};

export default Dashboard;