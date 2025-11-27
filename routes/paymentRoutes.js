const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const auth = require("../middleware/authMiddleware");

// Create order
router.post("/order", auth, paymentController.createOrder);

// Webhook (must NOT use auth)
router.post("/webhook", express.raw({ type: "application/json" }), paymentController.cashfreeWebhook);

module.exports = router;
