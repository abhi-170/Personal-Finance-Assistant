import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './Configs/dbConfig.js';

dotenv.config();
const app= express();

const PORT=process.env.PORT || 8081;

connectDB();
app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`);
})

app.get('/',(req,res)=>{
    res.send(`Backend is live here`);
})