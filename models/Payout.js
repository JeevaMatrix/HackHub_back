const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },

    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    upiId: { type: String, required: true }, // Organizer UPI

    transferId: { type: String, required: true, unique: true }, // Cashfree unique transfer ID

    payoutRef: { type: String }, // UTR / reference ID returned by Cashfree

    amountPaid: { type: Number, required: true },

    platformFee: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payout", payoutSchema);
