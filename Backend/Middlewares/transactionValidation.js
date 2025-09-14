// Transaction validation middleware
export const validateTransaction = (req, res, next) => {
    const { type, category, amount, date } = req.body;
    const errors = [];

    // Validate type
    if (!type) {
        errors.push('Transaction type is required');
    } else if (!['income', 'expense'].includes(type)) {
        errors.push('Transaction type must be either "income" or "expense"');
    }

    // Validate category
    if (!category) {
        errors.push('Category is required');
    } else if (typeof category !== 'string' || category.trim().length === 0) {
        errors.push('Category must be a non-empty string');
    } else if (category.length > 50) {
        errors.push('Category must be less than 50 characters');
    }

    // Validate amount
    if (amount === undefined || amount === null) {
        errors.push('Amount is required');
    } else {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            errors.push('Amount must be a valid number');
        } else if (numAmount <= 0) {
            errors.push('Amount must be greater than zero');
        } else if (numAmount > 999999999) {
            errors.push('Amount is too large');
        }
    }

    // Validate date
    if (!date) {
        errors.push('Date is required');
    } else {
        const transactionDate = new Date(date);
        if (isNaN(transactionDate.getTime())) {
            errors.push('Date must be a valid date');
        } else {
            const now = new Date();
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(now.getFullYear() + 1);

            if (transactionDate > oneYearFromNow) {
                errors.push('Date cannot be more than one year in the future');
            }
        }
    }

    // Validate description (optional)
    if (req.body.description && typeof req.body.description !== 'string') {
        errors.push('Description must be a string');
    } else if (req.body.description && req.body.description.length > 500) {
        errors.push('Description must be less than 500 characters');
    }

    if (errors.length > 0) {
        res.status(400);
        const error = new Error('Validation failed');
        error.details = errors;
        return next(error);
    }

    next();
};

// Transaction update validation (allows partial updates)
export const validateTransactionUpdate = (req, res, next) => {
    const { type, category, amount, date, description } = req.body;
    const errors = [];

    // Validate type if provided
    if (type !== undefined && !['income', 'expense'].includes(type)) {
        errors.push('Transaction type must be either "income" or "expense"');
    }

    // Validate category if provided
    if (category !== undefined) {
        if (typeof category !== 'string' || category.trim().length === 0) {
            errors.push('Category must be a non-empty string');
        } else if (category.length > 50) {
            errors.push('Category must be less than 50 characters');
        }
    }

    // Validate amount if provided
    if (amount !== undefined) {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            errors.push('Amount must be a valid number');
        } else if (numAmount <= 0) {
            errors.push('Amount must be greater than zero');
        } else if (numAmount > 999999999) {
            errors.push('Amount is too large');
        }
    }

    // Validate date if provided
    if (date !== undefined) {
        const transactionDate = new Date(date);
        if (isNaN(transactionDate.getTime())) {
            errors.push('Date must be a valid date');
        } else {
            const now = new Date();
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(now.getFullYear() + 1);

            if (transactionDate > oneYearFromNow) {
                errors.push('Date cannot be more than one year in the future');
            }
        }
    }

    // Validate description if provided
    if (description !== undefined) {
        if (typeof description !== 'string') {
            errors.push('Description must be a string');
        } else if (description.length > 500) {
            errors.push('Description must be less than 500 characters');
        }
    }

    if (errors.length > 0) {
        res.status(400);
        const error = new Error('Validation failed');
        error.details = errors;
        return next(error);
    }

    next();
};

// Validate bulk transaction creation
export const validateBulkTransactions = (req, res, next) => {
    const { transactions } = req.body;
    const errors = [];

    if (!Array.isArray(transactions)) {
        errors.push('Transactions must be an array');
    } else if (transactions.length === 0) {
        errors.push('At least one transaction is required');
    } else if (transactions.length > 100) {
        errors.push('Cannot process more than 100 transactions at once');
    } else {
        transactions.forEach((transaction, index) => {
            const { type, category, amount, date } = transaction;

            if (!type || !['income', 'expense'].includes(type)) {
                errors.push(`Transaction ${index + 1}: Invalid or missing type`);
            }

            if (!category || typeof category !== 'string' || category.trim().length === 0) {
                errors.push(`Transaction ${index + 1}: Invalid or missing category`);
            }

            if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
                errors.push(`Transaction ${index + 1}: Invalid or missing amount`);
            }

            if (!date || isNaN(new Date(date).getTime())) {
                errors.push(`Transaction ${index + 1}: Invalid or missing date`);
            }
        });
    }

    if (errors.length > 0) {
        res.status(400);
        const error = new Error('Bulk validation failed');
        error.details = errors;
        return next(error);
    }

    next();
};

// Validate query parameters for transaction listing
export const validateTransactionQuery = (req, res, next) => {
    const { page, limit, type, startDate, endDate, sortBy, sortOrder } = req.query;
    const errors = [];

    // Validate page
    if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        errors.push('Page must be a positive integer');
    }

    // Validate limit - allow up to 1000 for internal analytics calls
    if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 1000)) {
        errors.push('Limit must be between 1 and 1000');
    }

    // Validate type
    if (type && !['income', 'expense', 'all'].includes(type)) {
        errors.push('Type must be "income", "expense", or "all"');
    }

    // Validate sortBy
    if (sortBy && !['date', 'amount', 'category', 'createdAt'].includes(sortBy)) {
        errors.push('SortBy must be one of: date, amount, category, createdAt');
    }

    // Validate sortOrder
    if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
        errors.push('SortOrder must be "asc" or "desc"');
    }

    // Validate date range
    if (startDate && isNaN(new Date(startDate).getTime())) {
        errors.push('Start date must be a valid date');
    }

    if (endDate && isNaN(new Date(endDate).getTime())) {
        errors.push('End date must be a valid date');
    }

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            errors.push('Start date cannot be after end date');
        }
    }

    if (errors.length > 0) {
        res.status(400);
        const error = new Error('Query validation failed');
        error.details = errors;
        return next(error);
    }

    next();
};