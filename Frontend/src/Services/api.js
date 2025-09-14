import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if available
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getProfile: () => api.get('/auth/me'),
};

// Transaction API
export const transactionAPI = {
    getTransactions: (params) => api.get('/transactions', { params }),
    createTransaction: (transaction) => api.post('/transactions', transaction),
    updateTransaction: (id, transaction) => api.put(`/transactions/${id}`, transaction),
    deleteTransaction: (id) => api.delete(`/transactions/${id}`),
    getTransaction: (id) => api.get(`/transactions/${id}`),
};

// Analytics API
export const analyticsAPI = {
    getSummary: (params) => api.get('/analytics/summary', { params }),
    getCategoryData: (params) => api.get('/analytics/expenses/categories', { params }),
    getMonthlyData: (params) => api.get('/analytics/trends/monthly', { params }),
    getIncomeByCategory: (params) => api.get('/analytics/income/categories', { params }),
    getAnalytics: (params) => api.get('/analytics', { params }),
};

// Receipt API
export const receiptAPI = {
    uploadReceipt: (formData) => api.post('/receipts/preview', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
    processReceipt: (formData) => api.post('/receipts/process', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
    createFromPreview: (data) => api.post('/receipts/create-from-preview', data),
};

export default api;