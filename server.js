// server.js
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: "https://hackhub-now.netlify.app",
  credentials: true
}));
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));

//events
app.use('/api/event', require('./routes/eventRoutes'));

//registrations
app.use('/api/register', require('./routes/registration'));

//payments
app.use('/api/payment', require('./routes/paymentRoutes'));

//payouts
app.use('/api/payout', require('./routes/payoutRoutes'));

// Error handler (custom middleware)
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
