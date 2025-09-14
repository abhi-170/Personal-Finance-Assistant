import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import connectDB from './Configs/dbConfig.js';
import errorHandler from './Middlewares/errorHandler.js'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './Routes/authRoutes.js';
import transactionRoutes from './Routes/transactionRoutes.js';
import analyticsRoutes from './Routes/analyticsRoutes.js';
import receiptRoutes from './Routes/receiptRoutes.js';

dotenv.config();
const app= express();

const PORT=process.env.PORT || 8181;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.send(`Personal Finance Assistant Backend is live!`);
});

app.use('/api/auth',authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/receipts', receiptRoutes);

// Error handling middleware
app.use(errorHandler);

(async()=>{
    try {
    await connectDB();
    app.listen(PORT, () => {
    console.log(`Server is listening on ${PORT}`);
    });
} catch (error) {
    console.log(`Startup failed ${error.message}`);
    process.exit(1);
}
})();

