import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import Layout from '../components/Layout';
import { analyticsAPI, transactionAPI } from '../services/api';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const Analytics = () => {
    const [period, setPeriod] = useState('current_month');
    const [summaryData, setSummaryData] = useState(null);
    const [categoryData, setCategoryData] = useState(null);
    const [monthlyData, setMonthlyData] = useState(null);
    const [topTransactions, setTopTransactions] = useState({ expenses: [], income: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAnalyticsData();
    }, [period]);

    const fetchAnalyticsData = async () => {
        try {
            setIsLoading(true);

            // Get comprehensive analytics data
            const analyticsResponse = await analyticsAPI.getAnalytics();

            if (analyticsResponse.data.success) {
                const data = analyticsResponse.data.data;

                // Set summary data
                setSummaryData({
                    totalIncome: data.overview.totalIncome,
                    totalExpenses: data.overview.totalExpenses,
                    balance: data.overview.netIncome,
                    transactionCount: data.overview.transactionCount,
                });

                // Set category data for charts
                setCategoryData(data.expensesByCategory);

                // Set monthly data
                setMonthlyData(data.monthlyTrends);
            }

            // Get top transactions separately
            const [expenseResponse, incomeResponse] = await Promise.all([
                transactionAPI.getTransactions({
                    type: 'expense',
                    limit: 2,
                    sortBy: 'amount',
                    sortOrder: 'desc'
                }),
                transactionAPI.getTransactions({
                    type: 'income',
                    limit: 2,
                    sortBy: 'amount',
                    sortOrder: 'desc'
                })
            ]);

            const topExpenses = expenseResponse.data.success ? expenseResponse.data.data : [];
            const topIncome = incomeResponse.data.success ? incomeResponse.data.data : [];

            setTopTransactions({
                expenses: topExpenses,
                income: topIncome
            });

        } catch (error) {
            console.error('Error fetching analytics data:', error);
            // Set default values on error
            setSummaryData({
                totalIncome: 0,
                totalExpenses: 0,
                balance: 0,
                transactionCount: 0,
            });
            setCategoryData([]);
            setMonthlyData([]);
            setTopTransactions({ expenses: [], income: [] });
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    // Chart options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return formatCurrency(value);
                    },
                },
            },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `${context.label}: ${formatCurrency(context.raw)}`;
                    },
                },
            },
        },
    };

    // Prepare category chart data with different accent colors
    const categoryChartData = categoryData && categoryData.length > 0 ? {
        labels: categoryData.map(item => item.category),
        datasets: [
            {
                label: 'Expenses by Category',
                data: categoryData.map(item => Math.abs(item.total)),
                backgroundColor: [
                    '#3b82f6', // Blue
                    '#10b981', // Emerald
                    '#f59e0b', // Amber
                    '#ef4444', // Red
                    '#8b5cf6', // Violet
                    '#06b6d4', // Cyan
                    '#84cc16', // Lime
                    '#f97316', // Orange
                    '#ec4899', // Pink
                    '#6366f1', // Indigo
                    '#14b8a6', // Teal
                    '#eab308', // Yellow
                ],
                borderColor: [
                    '#2563eb', // Blue border
                    '#059669', // Emerald border
                    '#d97706', // Amber border
                    '#dc2626', // Red border
                    '#7c3aed', // Violet border
                    '#0891b2', // Cyan border
                    '#65a30d', // Lime border
                    '#ea580c', // Orange border
                    '#db2777', // Pink border
                    '#4f46e5', // Indigo border
                    '#0d9488', // Teal border
                    '#ca8a04', // Yellow border
                ],
                borderWidth: 2,
            },
        ],
    } : null;

    // Prepare monthly chart data as bar chart with smart date handling
    const monthlyChartData = monthlyData && monthlyData.length > 0 ? {
        labels: monthlyData.map(item => {
            const date = new Date(item.year, item.month - 1);
            // Smart handling: if filtered by month, show dates; otherwise show months
            if (period.includes('month')) {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else {
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
        }),
        datasets: [
            {
                label: 'Income',
                data: monthlyData.map(item => item.income),
                backgroundColor: '#10b981', // Green
                borderColor: '#059669',
                borderWidth: 1,
            },
            {
                label: 'Expenses',
                data: monthlyData.map(item => Math.abs(item.expense)),
                backgroundColor: '#ef4444', // Red
                borderColor: '#dc2626',
                borderWidth: 1,
            },
        ],
    } : null;

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
                <h1>Analytics</h1>
                <select
                    className="form-select"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    style={{ width: 'auto' }}
                >
                    <option value="current_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="current_year">This Year</option>
                    <option value="last_year">Last Year</option>
                </select>
            </div>

            {/* Summary Stats */}
            {summaryData && (
                <div className="stats-grid mb-6">
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                            {formatCurrency(summaryData.totalIncome)}
                        </div>
                        <div className="stat-label">Total Income</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
                            {formatCurrency(Math.abs(summaryData.totalExpenses))}
                        </div>
                        <div className="stat-label">Total Expenses</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-value" style={{
                            color: summaryData.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                        }}>
                            {formatCurrency(summaryData.balance)}
                        </div>
                        <div className="stat-label">Net Balance</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-value">
                            {summaryData.transactionCount}
                        </div>
                        <div className="stat-label">Transactions</div>
                    </div>
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-6">
                {/* Expenses by Category */}
                <div className="card">
                    <h3 className="mb-4">Expenses by Category</h3>
                    {categoryData && categoryData.length > 0 ? (
                        <div style={{ height: '400px' }}>
                            <Doughnut data={categoryChartData} options={doughnutOptions} />
                        </div>
                    ) : (
                        <div className="text-center p-6">
                            <p className="text-gray-600">No expense data available for this period.</p>
                        </div>
                    )}
                </div>

                {/* Top Transactions */}
                <div className="card">
                    <h3 className="mb-4">Top Transactions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Top Expenses */}
                        <div>
                            <h4 className="font-semibold text-red-600 mb-3 flex items-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                                    <path d="M19 14C19 14 20 13 19 12C18 11 17 10 16 9C15 8 14 7 12 7C10 7 9 8 8 9C7 10 6 11 5 12C4 13 5 14 5 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Top Expenses
                            </h4>
                            {topTransactions.expenses.length > 0 ? (
                                <div className="space-y-3">
                                    {topTransactions.expenses.map((transaction, index) => (
                                        <div key={transaction._id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{transaction.description}</p>
                                                    <p className="text-sm text-gray-600">{transaction.category}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(transaction.date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-red-600">
                                                        -{formatCurrency(Math.abs(transaction.amount))}
                                                    </p>
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                                            #{index + 1}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-4 text-gray-500">
                                    <p>No expense transactions found</p>
                                </div>
                            )}
                        </div>

                        {/* Top Income */}
                        <div>
                            <h4 className="font-semibold text-green-600 mb-3 flex items-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                                    <path d="M5 10C5 10 4 11 5 12C6 13 7 14 8 15C9 16 10 17 12 17C14 17 15 16 16 15C17 14 18 13 19 12C20 11 19 10 19 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 17V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Top Income
                            </h4>
                            {topTransactions.income.length > 0 ? (
                                <div className="space-y-3">
                                    {topTransactions.income.map((transaction, index) => (
                                        <div key={transaction._id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{transaction.description}</p>
                                                    <p className="text-sm text-gray-600">{transaction.category}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(transaction.date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-green-600">
                                                        +{formatCurrency(transaction.amount)}
                                                    </p>
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                                            #{index + 1}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-4 text-gray-500">
                                    <p>No income transactions found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Trends */}
            <div className="card mt-6">
                <h3 className="mb-4">Monthly Trends (Income vs Expenses)</h3>
                {monthlyData && monthlyData.length > 0 ? (
                    <div style={{ height: '400px' }}>
                        <Bar data={monthlyChartData} options={chartOptions} />
                    </div>
                ) : (
                    <div className="text-center p-6">
                        <p className="text-gray-600">No monthly data available.</p>
                    </div>
                )}
            </div>

            {/* Category Details Table */}
            {categoryData && categoryData.length > 0 && (
                <div className="card mt-6">
                    <h3 className="mb-4">Category Details</h3>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Transactions</th>
                                    <th>Total Amount</th>
                                    <th>Average Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categoryData.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.category}</td>
                                        <td>{item.count}</td>
                                        <td style={{ color: 'var(--color-danger)', fontWeight: '600' }}>
                                            {formatCurrency(Math.abs(item.total))}
                                        </td>
                                        <td style={{ color: 'var(--color-danger)', fontWeight: '600' }}>
                                            {formatCurrency(Math.abs(item.total) / item.count)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Analytics;