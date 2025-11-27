const CashfreeService = require("../services/cashfree");
const Registration = require("../models/Registration");
const Payment = require("../models/Payment");
const Event = require("../models/Event");
const jwt = require("jsonwebtoken");

exports.createOrder = async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const studentId = decoded.id;

    const { eventId } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    let amount = event.pricing.amount;

    if (event.pricing.earlyBird?.enabled) {
      const now = Date.now();
      if (now <= new Date(event.pricing.earlyBird.endDate).getTime()) {
        amount = event.pricing.earlyBird.amount;
      }
    }

    // Create order in Cashfree
    const order = await CashfreeService.createOrder({
      amount,
      eventId,
      studentId
    });

    // Create Registration
    await Registration.create({
      eventId,
      studentId,
      orderId: order.order_id,
      status: "pending",
      paymentStatus: "pending"
    });

    // Create Payment tracking record
    await Payment.create({
      orderId: order.order_id,
      studentId,
      eventId,
      amount,
      status: "pending"
    });

    return res.json({
      checkoutUrl: order.payment_link,
      orderId: order.order_id,
      amount
    });

  } catch (err) {
    console.error("Create Order Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


//confirmation of payment
exports.cashfreeWebhook = async (req, res) => {
  try {
    const data = req.body;

    const verified = verifyWebhook(data, req.headers["x-webhook-signature"]);
    if (!verified) return res.status(403).json({ message: "Invalid signature" });

    const orderId = data.orderId;
    const payment = await Payment.findOne({ orderId });

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (data.type === "PAYMENT_SUCCESS") {
      payment.status = "paid";
      payment.referenceId = data.referenceId;
      await payment.save();

      const registration = await Registration.findOne({ orderId });
      registration.status = "registered";
      registration.paymentStatus = "paid";
      await registration.save();

      // Trigger payout
      payoutService.autoPayout(registration, payment);
    } 
    
    else if (data.type === "PAYMENT_FAILED") {
      payment.status = "failed";
      await payment.save();

      const registration = await Registration.findOne({ orderId });
      registration.status = "cancelled";
      registration.paymentStatus = "failed";
      await registration.save();
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("Webhook Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
