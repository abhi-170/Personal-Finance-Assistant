import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import Tesseract from 'tesseract.js';
// Dynamic import for pdf-parse to avoid initialization issues
// import PDFParse from 'pdf-parse';
import sharp from 'sharp';
import { saveTransactionToDB } from '../Repository/transactionRepository.js';

class OCRService {
    constructor() {
        this.categories = ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
            'Healthcare', 'Education', 'Travel', 'Personal Care', 'Home & Garden',
            'Insurance', 'Taxes', 'Miscellaneous'];
        this.categoryKeywords = {
            'Shopping': ['shop', 'store', 'mall', 'market', 'purchase', 'buy', 'retail', 'walmart', 'target', 'amazon'],
            'Food & Dining': ['restaurant', 'food', 'cafe', 'dinner', 'lunch', 'breakfast', 'snack', 'pizza', 'burger', 'coffee'],
            'Entertainment': ['movie', 'cinema', 'concert', 'entertainment', 'show', 'ticket', 'netflix', 'spotify'],
            'Healthcare': ['hospital', 'doctor', 'medical', 'pharmacy', 'health', 'clinic', 'cvs', 'walgreens'],
            'Bills & Utilities': ['bill', 'utility', 'electricity', 'gas', 'water', 'internet', 'phone', 'cable'],
            'Transportation': ['transport', 'taxi', 'bus', 'train', 'fuel', 'gas station', 'uber', 'lyft', 'exxon', 'shell'],
            'Personal Care': ['salon', 'barber', 'spa', 'beauty', 'cosmetics', 'skincare'],
            'Travel': ['hotel', 'flight', 'airline', 'booking', 'airbnb'],
            'Home & Garden': ['home depot', 'lowes', 'garden', 'hardware'],
            'Insurance': ['insurance', 'policy', 'premium'],
            'Education': ['school', 'university', 'education', 'tuition'],
            'Taxes': ['tax', 'irs', 'revenue']
        };
    }

    async extractTextFromImage(filePath) {
        try {
            console.log('Starting OCR processing for:', filePath);

            // Preprocess image for better OCR accuracy
            const processedImagePath = await this.preprocessImage(filePath);

            const { data: { text, confidence } } = await Tesseract.recognize(processedImagePath, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            // Clean up processed image if it's different from original
            if (processedImagePath !== filePath) {
                await fs.unlink(processedImagePath).catch(() => { });
            }

            console.log('OCR completed. Text length:', text.length);
            return { text: text.trim(), confidence };
        } catch (error) {
            console.error('OCR Error:', error);
            throw new Error(`OCR processing failed: ${error.message}`);
        }
    }

    async extractTextFromPDF(filePath) {
        try {
            // Dynamic import to avoid initialization issues
            const { default: PDFParse } = await import('pdf-parse');
            const pdfBuffer = await fs.readFile(filePath);
            const data = await PDFParse(pdfBuffer);
            return { text: data.text.trim(), confidence: 90 };
        } catch (error) {
            console.error('PDF parsing error:', error);
            throw new Error(`PDF processing failed: ${error.message}`);
        }
    }

    async preprocessImage(filePath) {
        try {
            const processedPath = filePath.replace(/\.(jpg|jpeg|png|gif)$/i, '_processed.png');

            await sharp(filePath)
                .resize(null, 1600, { withoutEnlargement: true }) // Increased resolution for better OCR
                .greyscale()
                .normalize() // Improve contrast
                .sharpen({ sigma: 1, m1: 0.5, m2: 2, x1: 2, y2: 10, y3: 20 }) // Enhanced sharpening
                .threshold(128) // Convert to pure black and white for better OCR
                .png({ compressionLevel: 0 }) // No compression for best quality
                .toFile(processedPath);

            return processedPath;
        } catch (error) {
            console.error('Image preprocessing error:', error);
            return filePath; // Return original if preprocessing fails
        }
    }

    parseTransactionsFromText(text) {
        const transactions = [];

        // Try to parse as receipt format
        const receiptTransactions = this.parseReceiptFormat(text);
        if (receiptTransactions.length > 0) {
            return receiptTransactions;
        }

        // Try to parse as transaction list format
        const listTransactions = this.parseTransactionList(text);
        return listTransactions;
    }

    parseReceiptFormat(text) {
        const transactions = [];

        // Clean and preprocess the OCR text
        const cleanedText = this.cleanOCRText(text);
        const lines = cleanedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        console.log('Processing cleaned OCR text:', cleanedText.substring(0, 200) + '...');

        let merchant = '';
        let totalAmount = 0;
        let date = null;

        // Enhanced patterns for better extraction
        const amountPatterns = [
            /\$\s?(\d+[.,]\d{2})\b/g,           // $XX.XX format
            /(\d+[.,]\d{2})\s?\$/g,             // XX.XX$ format
            /total[:\s]*\$?\s?(\d+[.,]\d{2})/gi, // Total: $XX.XX
            /amount[:\s]*\$?\s?(\d+[.,]\d{2})/gi, // Amount: $XX.XX
            /(\d+[.,]\d{2})\s*(?:usd|dollars?)/gi // XX.XX USD
        ];

        const datePatterns = [
            /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,    // MM/DD/YYYY or DD/MM/YYYY
            /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g,      // YYYY/MM/DD
            /(\w{3}\s+\d{1,2},?\s+\d{4})/g,                // Jan 15, 2024
            /(\d{1,2}\s+\w{3}\s+\d{4})/g                   // 15 Jan 2024
        ];

        // Extract potential amounts
        const amounts = [];
        let match;

        for (const pattern of amountPatterns) {
            while ((match = pattern.exec(text)) !== null) {
                const amount = parseFloat(match[1].replace(',', '.'));
                if (amount > 0 && amount < 50000) { // Reasonable range
                    amounts.push({
                        value: amount,
                        context: match[0],
                        index: match.index
                    });
                }
            }
        }

        // Extract dates
        let receiptDate = new Date();
        for (const pattern of datePatterns) {
            while ((match = pattern.exec(text)) !== null) {
                const parsedDate = new Date(match[1]);
                if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 2020) {
                    receiptDate = parsedDate;
                    break;
                }
            }
            if (receiptDate.getFullYear() >= 2020) break;
        }

        // Smart total detection
        const totalKeywords = [
            { keywords: ['total', 'grand total', 'final total'], priority: 10 },
            { keywords: ['amount due', 'balance due'], priority: 9 },
            { keywords: ['subtotal', 'sub total'], priority: 8 },
            { keywords: ['charge', 'payment'], priority: 7 },
            { keywords: ['sum', 'net'], priority: 6 }
        ];

        // Find the most likely total amount
        let bestMatch = null;
        let highestPriority = 0;

        for (const amount of amounts) {
            const contextLine = text.substring(Math.max(0, amount.index - 50), amount.index + 50).toLowerCase();

            for (const group of totalKeywords) {
                for (const keyword of group.keywords) {
                    if (contextLine.includes(keyword)) {
                        if (group.priority > highestPriority) {
                            highestPriority = group.priority;
                            bestMatch = amount;
                        }
                    }
                }
            }
        }

        if (bestMatch) {
            totalAmount = bestMatch.value;
        } else if (amounts.length > 0) {
            // Fallback: use the largest reasonable amount
            totalAmount = Math.max(...amounts.map(a => a.value));
        }

        // Extract merchant name with improved logic
        const businessPatterns = [
            /^([A-Z][A-Z\s&]{2,30})\s*$/m,                    // All caps business names
            /^([A-Z][a-zA-Z\s&]{2,30}(?:LLC|Inc|Corp|Ltd))$/m, // Business with suffixes
            /^([A-Z][a-zA-Z\s&'.-]{2,30}(?:Restaurant|Cafe|Store|Shop|Market|Bar|Grill))$/mi, // Business types
            /^([A-Z][a-zA-Z\s&'.-]{5,30})$/m                  // General capitalized names
        ];

        let foundMerchant = false;

        // Try to find merchant from business patterns first
        for (const pattern of businessPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const candidate = match[1].trim();
                // Filter out common non-business text
                const skipWords = ['RECEIPT', 'THANK YOU', 'CUSTOMER COPY', 'CARD PAYMENT', 'CASH PAYMENT', 'TOTAL', 'SUBTOTAL'];
                if (!skipWords.some(word => candidate.toUpperCase().includes(word)) && candidate.length >= 3) {
                    merchant = candidate;
                    foundMerchant = true;
                    break;
                }
            }
        }

        // Fallback: look at first few lines for business names
        if (!foundMerchant) {
            const businessKeywords = ['llc', 'inc', 'corp', 'ltd', 'restaurant', 'store', 'shop', 'market', 'cafe', 'bar', 'grill', 'hotel', 'gas', 'station'];

            for (let i = 0; i < Math.min(lines.length, 8); i++) {
                const line = lines[i];
                if (line.length >= 3 && line.length <= 50) {
                    const lowerLine = line.toLowerCase();
                    const hasBusinessKeyword = businessKeywords.some(keyword => lowerLine.includes(keyword));
                    const hasExcessiveNumbers = (line.match(/\d/g) || []).length > line.length * 0.4;
                    const isAllCaps = line === line.toUpperCase() && line.length > 2;
                    const hasValidChars = /^[A-Za-z0-9\s&'.-]+$/.test(line);

                    // Skip common receipt headers
                    const skipPatterns = ['receipt', 'thank you', 'customer', 'copy', 'store #', 'reg #', 'cashier', 'card payment'];
                    const shouldSkip = skipPatterns.some(pattern => lowerLine.includes(pattern));

                    if ((hasBusinessKeyword || isAllCaps) && !hasExcessiveNumbers && hasValidChars && !shouldSkip) {
                        merchant = this.cleanMerchantName(line);
                        foundMerchant = true;
                        break;
                    }
                }
            }
        }

        // Final fallback: use first meaningful line
        if (!foundMerchant && lines.length > 0) {
            for (const line of lines.slice(0, 5)) {
                if (line.length >= 3 && line.length <= 40 && !/^\d+$/.test(line)) {
                    merchant = this.cleanMerchantName(line);
                    break;
                }
            }
        }

        // Category detection
        let category = this.inferCategory(merchant || text);

        if (totalAmount > 0) {
            // Generate a more descriptive transaction description
            const description = this.generateDescription(merchant, cleanedText, category);

            transactions.push({
                type: 'expense',
                category: category,
                amount: totalAmount,
                date: receiptDate,
                description: description,
                confidence: 80
            });

            console.log('Extracted transaction:', {
                amount: totalAmount,
                category,
                description,
                date: receiptDate
            });
        }

        return transactions;
    }

    parseTransactionList(text) {
        const transactions = [];
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        for (const line of lines) {
            if (this.containsAmountPattern(line)) {
                const transaction = {
                    date: new Date(),
                    description: 'Transaction',
                    category: 'Other',
                    type: 'expense',
                    amount: this.parseAmount(line),
                    confidence: 60
                };

                // Extract date if present
                if (this.containsDatePattern(line)) {
                    transaction.date = this.parseDate(line);
                }

                // Extract description
                const cleanLine = line.replace(/[\d.,₹$€£¥]+/g, '').trim();
                if (cleanLine.length > 2) {
                    transaction.description = cleanLine;
                    transaction.category = this.inferCategory(cleanLine);
                }

                if (transaction.amount > 0) {
                    transactions.push(transaction);
                }
            }
        }

        return transactions;
    }

    containsDatePattern(text) {
        const datePatterns = [
            /\d{4}-\d{2}-\d{2}/,
            /\d{2}-\d{2}-\d{4}/,
            /\d{2}\/\d{2}\/\d{4}/,
            /\d{4}\/\d{2}\/\d{2}/,
            /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i
        ];
        return datePatterns.some(pattern => pattern.test(text));
    }

    containsAmountPattern(text) {
        const amountPatterns = [
            /[\d.,]+/,
            /₹\s*[\d.,]+/,
            /\$\s*[\d.,]+/,
            /€\s*[\d.,]+/,
            /£\s*[\d.,]+/
        ];
        return amountPatterns.some(pattern => pattern.test(text));
    }

    parseDate(text) {
        const datePatterns = [
            { pattern: /(\d{4})-(\d{2})-(\d{2})/, format: 'YYYY-MM-DD' },
            { pattern: /(\d{2})-(\d{2})-(\d{4})/, format: 'DD-MM-YYYY' },
            { pattern: /(\d{2})\/(\d{2})\/(\d{4})/, format: 'MM/DD/YYYY' },
            { pattern: /(\d{4})\/(\d{2})\/(\d{2})/, format: 'YYYY/MM/DD' }
        ];

        for (const { pattern, format } of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                let year, month, day;
                if (format === 'YYYY-MM-DD' || format === 'YYYY/MM/DD') {
                    [, year, month, day] = match;
                } else if (format === 'DD-MM-YYYY') {
                    [, day, month, year] = match;
                } else if (format === 'MM/DD/YYYY') {
                    [, month, day, year] = match;
                }
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
        }

        return new Date();
    }

    parseAmount(text) {
        const cleanText = text.replace(/[₹$€£¥,\s]/g, '');
        const match = cleanText.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : 0;
    }

    inferCategory(text) {
        const lowerText = text.toLowerCase();

        for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return category;
            }
        }

        return 'Miscellaneous';
    }

    cleanMerchantName(name) {
        if (!name || typeof name !== 'string') return 'Unknown Merchant';

        let cleaned = name.trim();

        // Remove common prefixes/suffixes that aren't part of business name
        cleaned = cleaned.replace(/^(STORE|LOCATION|REG|REGISTER)\s*#?\s*\d*\s*/i, '');
        cleaned = cleaned.replace(/\s*(STORE|LOCATION|REG|REGISTER)\s*#?\s*\d*$/i, '');

        // Remove excessive spaces and special characters at start/end
        cleaned = cleaned.replace(/^[^\w\s]+|[^\w\s]+$/g, '');
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        // Capitalize properly (first letter of each word)
        cleaned = cleaned.toLowerCase().split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        return cleaned.length > 1 ? cleaned : 'Unknown Merchant';
    }

    cleanOCRText(text) {
        if (!text || typeof text !== 'string') return '';

        let cleaned = text;

        // Remove common OCR artifacts and misread characters
        cleaned = cleaned.replace(/[|{}[\]\\]/g, ''); // Remove common OCR artifacts
        cleaned = cleaned.replace(/['']/g, "'"); // Normalize apostrophes
        cleaned = cleaned.replace(/[""]/g, '"'); // Normalize quotes
        cleaned = cleaned.replace(/—/g, '-'); // Normalize dashes

        // Fix common OCR misreads
        cleaned = cleaned.replace(/\b0\b/g, 'O'); // 0 mistaken for O in text
        cleaned = cleaned.replace(/\bI\b/g, '1'); // I mistaken for 1 in numbers
        cleaned = cleaned.replace(/\bl\b/g, '1'); // l mistaken for 1 in numbers

        // Remove excessive whitespace and clean up
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        // Remove lines that are just symbols or artifacts
        cleaned = cleaned.split('\n')
            .filter(line => {
                const trimmed = line.trim();
                // Keep lines that have meaningful content
                return trimmed.length > 0 &&
                    !/^[^\w\s]*$/.test(trimmed) && // Not just symbols
                    !/^[*_=\-+.]{3,}$/.test(trimmed); // Not just repeated symbols
            })
            .join('\n');

        return cleaned;
    }

    generateDescription(merchant, ocrText, category) {
        // Start with merchant name as base
        let description = merchant && merchant !== 'Unknown Merchant' ? merchant : '';

        // Look for specific items or services mentioned
        const items = this.extractItems(ocrText, category);

        if (items.length > 0) {
            if (description) {
                description += ' - ';
            }
            if (items.length === 1) {
                description += items[0];
            } else if (items.length <= 3) {
                description += items.join(', ');
            } else {
                description += `${items.slice(0, 2).join(', ')} and ${items.length - 2} other items`;
            }
        } else if (description) {
            // If we have merchant but no items, add category context
            const categoryContext = this.getCategoryContext(category);
            if (categoryContext) {
                description += ` - ${categoryContext}`;
            }
        }

        // Fallback if we still don't have a good description
        if (!description || description.trim().length < 3) {
            description = `${category} expense`;
        }

        // Clean up and format
        description = description.trim();
        description = description.charAt(0).toUpperCase() + description.slice(1);

        return description.substring(0, 100); // Limit length
    }

    extractItems(text, category) {
        const items = [];
        const lines = text.toLowerCase().split('\n');

        // Category-specific item extraction patterns
        const itemPatterns = {
            'Food & Dining': [
                /(?:^|\s)(pizza|burger|sandwich|coffee|tea|salad|soup|pasta|chicken|beef|fish|fries|drink|beer|wine|dessert|cake|ice cream)(?:\s|$)/g,
                /(?:^|\s)(breakfast|lunch|dinner|brunch|appetizer|entree|side|beverage)(?:\s|$)/g
            ],
            'Transportation': [
                /(?:^|\s)(gas|fuel|regular|premium|diesel|parking|toll|subway|bus|taxi|uber|lyft)(?:\s|$)/g
            ],
            'Shopping': [
                /(?:^|\s)(shirt|pants|shoes|dress|jacket|electronics|phone|laptop|book|magazine|gift)(?:\s|$)/g
            ],
            'Healthcare': [
                /(?:^|\s)(prescription|medicine|consultation|checkup|vaccine|treatment|therapy)(?:\s|$)/g
            ],
            'Entertainment': [
                /(?:^|\s)(movie|ticket|concert|show|game|subscription|streaming)(?:\s|$)/g
            ]
        };

        // Look for items specific to the category
        if (itemPatterns[category]) {
            for (const pattern of itemPatterns[category]) {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const item = match[1].trim();
                    if (item.length > 2 && !items.includes(item)) {
                        items.push(item.charAt(0).toUpperCase() + item.slice(1));
                    }
                }
            }
        }

        // If no specific items found, look for general product-like terms
        if (items.length === 0) {
            for (const line of lines) {
                // Look for lines that might be item descriptions
                // Simple heuristic: lines with letters and possibly numbers, not too long
                if (line.length > 3 && line.length < 30 &&
                    /^[a-zA-Z][a-zA-Z0-9\s-]*$/.test(line) &&
                    !/\b(total|subtotal|tax|amount|cash|card|receipt|thank|you|store|location)\b/.test(line)) {

                    const cleanItem = line.trim().replace(/^\d+\s*/, ''); // Remove leading numbers
                    if (cleanItem.length > 2 && !items.includes(cleanItem)) {
                        items.push(cleanItem.charAt(0).toUpperCase() + cleanItem.slice(1));
                        if (items.length >= 5) break; // Limit items
                    }
                }
            }
        }

        return items.slice(0, 5); // Return max 5 items
    }

    getCategoryContext(category) {
        const contexts = {
            'Food & Dining': 'meal',
            'Transportation': 'travel',
            'Shopping': 'purchase',
            'Entertainment': 'entertainment',
            'Healthcare': 'medical',
            'Bills & Utilities': 'bill payment',
            'Personal Care': 'personal care',
            'Education': 'education',
            'Travel': 'travel',
            'Home & Garden': 'home improvement',
            'Insurance': 'insurance',
            'Taxes': 'tax payment'
        };

        return contexts[category] || 'expense';
    }

    async processDocument(filePath, fileType) {
        try {
            let extractionResult;

            if (fileType === 'image') {
                extractionResult = await this.extractTextFromImage(filePath);
            } else if (fileType === 'pdf') {
                extractionResult = await this.extractTextFromPDF(filePath);
            } else {
                throw new Error('Unsupported file type');
            }

            const transactions = this.parseTransactionsFromText(extractionResult.text);

            return {
                extractedText: extractionResult.text,
                confidence: extractionResult.confidence,
                transactions,
                transactionCount: transactions.length
            };
        } catch (error) {
            console.error('Document processing error:', error);
            throw error;
        }
    }
}

const ocrService = new OCRService();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only image files and PDFs are allowed'), false);
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Preview receipt text without saving (for manual review)
export const previewReceipt = async (req, res, next) => {
    try {
        console.log('Preview receipt request received');

        if (!req.file) {
            console.log('No file uploaded');
            res.status(400);
            throw new Error('No file uploaded');
        }

        console.log('File received:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });

        const filePath = req.file.path;
        const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'pdf';

        try {
            console.log(`Processing ${fileType} file: ${req.file.originalname}`);

            // Use the new OCR service
            const result = await ocrService.processDocument(filePath, fileType);
            console.log('OCR processing completed:', {
                textLength: result.extractedText.length,
                transactionCount: result.transactionCount,
                confidence: result.confidence
            });

            // Format response for frontend (simplified structure)
            let responseData = {
                description: 'Transaction description',
                amount: 0,
                category: 'Miscellaneous',
                date: new Date().toISOString().split('T')[0]
            };

            // Use the first parsed transaction if available
            if (result.transactions.length > 0) {
                const firstTransaction = result.transactions[0];
                responseData = {
                    description: firstTransaction.description || 'Transaction description',
                    amount: firstTransaction.amount || 0,
                    category: firstTransaction.category || 'Miscellaneous',
                    date: firstTransaction.date ? firstTransaction.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                };
                console.log('Using parsed transaction data:', responseData);
            } else {
                console.log('No transactions parsed, using default data');
            }

            res.status(200).json({
                success: true,
                message: 'Receipt processed successfully',
                data: responseData
            });

        } finally {
            // Clean up uploaded file
            try {
                await fs.unlink(filePath);
                console.log('Cleaned up uploaded file:', filePath);
            } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
            }
        }

    } catch (error) {
        console.error('Receipt preview error:', error);
        console.error('Error stack:', error.stack);
        // Clean up file if there was an error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up file after error:', cleanupError);
            }
        }
        next(error);
    }
};// Process receipt upload
export const processReceipt = async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400);
            throw new Error('No file uploaded');
        }

        const userId = req.user._id;
        const filePath = req.file.path;
        const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'pdf';

        try {
            // Use the new OCR service
            const result = await ocrService.processDocument(filePath, fileType);

            // Save transactions to database
            const createdTransactions = [];
            for (const transactionData of result.transactions) {
                const transaction = await saveTransactionToDB({
                    ...transactionData,
                    userId
                });
                createdTransactions.push(transaction);
            }

            res.status(201).json({
                success: true,
                message: `Receipt processed successfully. ${createdTransactions.length} transactions created.`,
                data: {
                    extractedText: result.extractedText.substring(0, 500),
                    transactions: createdTransactions,
                    fileName: req.file.originalname
                }
            });

        } finally {
            // Clean up uploaded file
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
            }
        }

    } catch (error) {
        // Clean up file if there was an error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up file after error:', cleanupError);
            }
        }
        next(error);
    }
};

// Create transactions from manual review data
export const createFromPreview = async (req, res, next) => {
    try {
        const { transactions } = req.body;
        const userId = req.user._id;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            res.status(400);
            throw new Error('Please provide an array of transactions');
        }

        const createdTransactions = [];
        const errors = [];

        for (let i = 0; i < transactions.length; i++) {
            try {
                const transactionData = {
                    ...transactions[i],
                    userId,
                    amount: parseFloat(transactions[i].amount),
                    date: new Date(transactions[i].date)
                };

                const transaction = await saveTransactionToDB(transactionData);
                createdTransactions.push(transaction);
            } catch (error) {
                errors.push({
                    index: i,
                    error: error.message,
                    transaction: transactions[i]
                });
            }
        }

        res.status(201).json({
            success: true,
            message: `${createdTransactions.length} transactions created from receipt preview`,
            data: {
                created: createdTransactions,
                errors: errors
            }
        });
    } catch (error) {
        next(error);
    }
};