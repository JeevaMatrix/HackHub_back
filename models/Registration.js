const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
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

    // registration status
    status: {
      type: String,
      enum: ["pending", "registered", "cancelled"],
      default: "pending"
    },

    // payment flow
    paymentStatus: {
      type: String,
      enum: ["not_required", "pending", "paid", "failed"],
      default: "not_required"
    },

    // cashfree or any payment id
    paymentId: { type: String },

    // extra metadata for future
    notes: { type: String }
  },
  { timestamps: { createdAt: "registeredAt", updatedAt: false } }
);

module.exports = mongoose.model("Registration", registrationSchema);
