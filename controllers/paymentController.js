const crypto = require("crypto");
const Payment = require("../models/Payment");
const Registration = require("../models/Registration");
const Event = require("../models/Event");
const cashfree = require("../services/cashfree");
const payoutService = require("../services/payout");

// -------------------------
// CREATE ORDER
// -------------------------
exports.createOrder = async (req, res) => {
  try {
    const { eventId } = req.body;
    const user = req.user; // from auth middleware

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!user.phone) {
      return res.status(400).json({ message: "Phone number required for payment" });
    }


    const order = await cashfree.createOrder({
      amount: event.pricing.amount,
      eventId,
      student: user
    });

    // Save payment entry
    await Payment.create({
      orderId: order.order_id,
      eventId,
      studentId: user._id,
      amount: event.pricing.amount,
      status: "pending"
    });

    // Save registration entry
    await Registration.create({
      eventId,
      studentId: user._id,
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
    const rawBody = JSON.stringify(req.body);

    // verify signature
    const secret = process.env.CF_PG_SECRET_KEY;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(timestamp + rawBody)
      .digest("base64");

    if (signature !== expectedSig) {
      return res.status(403).json({ message: "Invalid signature" });
    }

    const data = req.body;
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
