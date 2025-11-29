const crypto = require("crypto");
const Payment = require("../models/Payment");
const Registration = require("../models/Registration");
const Event = require("../models/Event");
const cashfree = require("../services/cashfree");
const payoutService = require("../services/payoutService");
const User = require("../models/User");

// -------------------------
// CREATE ORDER
// -------------------------
exports.createOrder = async (req, res) => {
  try {
    const { eventId } = req.body;
    const user = req.user; // from auth middleware
    const student = await User.findById(user.id);

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!user.phone) {
      return res.status(400).json({ message: "Phone number required for payment" });
    }


    const order = await cashfree.createOrder({
      amount: event.pricing.amount,
      eventId,
      student: student
    });

    // Save payment entry
    await Payment.create({
      orderId: order.order_id,
      eventId,
      studentId: student._id,
      amount: event.pricing.amount,
      status: "pending"
    });

    // Save registration entry
    await Registration.create({
      eventId,
      studentId: student._id,
      orderId: order.order_id,
      status: "pending",
      paymentStatus: "pending"
    });

    return res.json(order);

  } catch (err) {
    console.error("Create Order Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// -------------------------
// CASHFREE WEBHOOK
// -------------------------
exports.cashfreeWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    
    // Use raw body (buffer converted to string)
    const rawBody = req.body.toString('utf8');

    // Verify signature
    const secret = process.env.CF_PG_SECRET_KEY;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(timestamp + rawBody)
      .digest("base64");

    if (signature !== expectedSig) {
      return res.status(403).json({ message: "Invalid signature" });
    }

    // Parse the body after verification
    const data = JSON.parse(rawBody);
    const orderId = data.data.order.order_id;
    const paymentStatus = data.data.payment.payment_status;
    const cfPaymentId = data.data.payment.cf_payment_id;

    const payment = await Payment.findOne({ orderId });
    const registration = await Registration.findOne({ orderId });

    if (!payment || !registration) {
      return res.status(404).json({ message: "Record not found" });
    }

    if (data.type === "PAYMENT_SUCCESS_WEBHOOK") {
      payment.status = "paid";
      payment.referenceId = cfPaymentId;
      await payment.save();

      registration.status = "registered";
      registration.paymentStatus = "paid";
      await registration.save();

      payoutService.autoPayout(registration, payment);
    }
    else if (data.type === "PAYMENT_FAILED_WEBHOOK") {
      payment.status = "failed";
      await payment.save();

      registration.status = "cancelled";
      registration.paymentStatus = "failed";
      await registration.save();
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


//manual payout controller (optional)
exports.manualPayout = async (req, res) => {
  try {
    const { registrationId, paymentId } = req.body;
    const registration = await Registration.findById(registrationId);
    const payment = await Payment.findById(paymentId);
    if (!registration || !payment) {
      return res.status(404).json({ message: "Record not found" });
    }
    const result = await payoutService.autoPayout(registration, payment);
    if (result) {
      res.json({ message: "Payout processed successfully" });
    } else {
      res.status(400).json({ message: "Payout failed or skipped" });
    }
  } catch (err) {
    console.error("Manual Payout Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};