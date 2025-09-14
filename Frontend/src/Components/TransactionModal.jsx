import React, { useState, useEffect } from 'react';
import { transactionAPI } from '../Services/api.js';

const TransactionModal = ({ transaction, onClose, categoryOptions }) => {
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        type: 'expense',
        category: '',
        date: new Date().toISOString().split('T')[0],
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (transaction) {
            setFormData({
                description: transaction.description,
                amount: Math.abs(transaction.amount).toString(),
                type: transaction.type,
                category: transaction.category,
                date: new Date(transaction.date).toISOString().split('T')[0],
            });
        }
    }, [transaction]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // If type changes, reset category
        if (name === 'type') {
            setFormData({
                ...formData,
                [name]: value,
                category: '' // Reset category when type changes
            });
        } else if (name === 'date') {
            // Validate date - cannot be in the future
            const selectedDate = new Date(value);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // Set to end of today
            
            if (selectedDate > today) {
                setError('Transaction date cannot be in the future');
                return;
            } else {
                setError(''); // Clear error if date is valid
            }
            
            setFormData({
                ...formData,
                [name]: value,
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    const getAvailableCategories = () => {
        if (!categoryOptions) return [];
        return categoryOptions[formData.type] || [];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.description.trim()) {
            setError('Description is required');
            return;
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (!formData.category) {
            setError('Please select a category');
            return;
        }

        // Additional date validation before submission
        const selectedDate = new Date(formData.date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        if (selectedDate > today) {
            setError('Transaction date cannot be in the future');
            return;
        }

        // Check if date is too far in the past (more than 10 years)
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
        
        if (selectedDate < tenYearsAgo) {
            setError('Transaction date cannot be more than 10 years in the past');
            return;
        }

        setIsLoading(true);

        try {
            const transactionData = {
                description: formData.description.trim(),
                amount: parseFloat(formData.amount),
                type: formData.type,
                category: formData.category,
                date: formData.date,
            };

            if (transaction) {
                // Update existing transaction
                await transactionAPI.updateTransaction(transaction._id, transactionData);
            } else {
                // Create new transaction
                await transactionAPI.createTransaction(transactionData);
            }

            onClose(true); // Refresh parent component
        } catch (error) {
            setError(error.response?.data?.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal">
                <div className="modal-header">
                    <h2>{transaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
                    <button
                        className="modal-close"
                        onClick={() => onClose()}
                        type="button"
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="description" className="form-label">
                                Description *
                            </label>
                            <input
                                type="text"
                                id="description"
                                name="description"
                                className="form-input"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="e.g., Grocery shopping, Salary payment"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label htmlFor="amount" className="form-label">
                                    Amount *
                                </label>
                                <input
                                    type="number"
                                    id="amount"
                                    name="amount"
                                    className="form-input"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="type" className="form-label">
                                    Type *
                                </label>
                                <select
                                    id="type"
                                    name="type"
                                    className="form-select"
                                    value={formData.type}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label htmlFor="category" className="form-label">
                                    Category *
                                </label>
                                <select
                                    id="category"
                                    name="category"
                                    className="form-select"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {getAvailableCategories().map(category => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="date" className="form-label">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    className="form-input"
                                    value={formData.date}
                                    onChange={handleChange}
                                    max={new Date().toISOString().split('T')[0]} // Prevent future dates
                                    min="2010-01-01" // Reasonable minimum date
                                    required
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onClose()}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="spinner"></div>
                        ) : (
                            transaction ? 'Update Transaction' : 'Add Transaction'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionModal;