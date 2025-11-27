const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: Number,
  status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  referenceId: String, // Cashfree reference number
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
