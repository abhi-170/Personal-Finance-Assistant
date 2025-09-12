import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './Configs/dbConfig.js';

dotenv.config();
const app= express();

const PORT=process.env.PORT || 8181;

app.get('/',(req,res)=>{
    res.send(`Backend is live here`);
})

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

