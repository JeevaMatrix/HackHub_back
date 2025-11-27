// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

//Signup Route
router.post('/signup', authController.signup);

// Login Route
router.post('/login', authController.login);

// Refresh Token Route
router.post('/refresh-token', authController.refreshToken);

//me
router.get("/me", authController.getMe);

// // OTP Request Route (for password reset)
// router.post('/request-otp', authController.requestOtp);

// // Password Reset Route (with OTP verification)
// router.post('/reset-password', authController.resetPassword);

module.exports = router;
