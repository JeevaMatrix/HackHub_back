const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },

    role: { type: String, enum: ["student", "organizer"], required: true },

    collegeId: String,
    department: String,
    year: String,
    phone: {
      type: String,
      default: null
    },
    upiId: {
      type: String,
      default: null
    },

    isEmailVerified: { type: Boolean, default: false },

    beneId: {
      type: String,
      default: null
    },

    isBeneficiaryCreated: {
      type: Boolean,
      default: false
    },

    organizerInfo: {
      designation: String,
      approvalStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
      }
    },

    registeredEventIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Event" }
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
