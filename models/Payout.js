const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema({
  payoutRef: String,
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amountPaid: Number,  
  platformFee: Number,
  upiId: String,
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("Payout", payoutSchema);
