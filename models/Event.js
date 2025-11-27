const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    // Basic Details
    title: { type: String, required: true },
    description: { type: String },
    bannerUrl: { type: String }, // Image URL

    // Organizer
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Event Category
    type: {
      type: String,
      enum: ["hackathon", "workshop", "contest"],
      required: true
    },

    // Visibility
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public"
    },

    // Allowed colleges (for private events)
    allowedCollegeIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "College" }
    ],

    // Event Schedule
    date: {
      start: { type: Date, required: true },
      end: { type: Date, required: true }
    },

    venue: { type: String },

    // Pricing and Payments
    pricing: {
      isPaid: { type: Boolean, default: false },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },

      earlyBird: {
        enabled: { type: Boolean, default: false },
        amount: { type: Number },
        endDate: { type: Date }
      }
    },

    // Registration logic
    registrationLimit: { type: Number, default: 0 }, // 0 = unlimited
    registeredCount: { type: Number, default: 0 },

    // Registered Users (student list)
    registeredStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    // Future-proof fields
    tags: [{ type: String }], // For SEO & category filtering
    status: {
      type: String,
      enum: ["upcoming", "live", "completed", "cancelled"],
      default: "upcoming"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
