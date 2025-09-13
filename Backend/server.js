import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './Configs/dbConfig.js';
import errorHandler from './Middlewares/errorHandler.js'


// Import routes
import authRoutes from './Routes/authRoutes.js';
import transactionRoutes from './Routes/transactionRoutes.js';
import analyticsRoutes from './Routes/analyticsRoutes.js';
import receiptRoutes from './Routes/receiptRoutes.js';

dotenv.config();
const app= express();

const PORT=process.env.PORT || 8181;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.send(`Personal Finance Assistant Backend is live!`);
});

app.use('api/auth',authRoutes);
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

