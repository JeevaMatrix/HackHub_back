const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },   // Cashfree PG Order ID
    cfPaymentId: { type: String },                             // Cashfree internal payment ID

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    amount: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },

    referenceId: { type: String },  // UTR / Bank Ref
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
