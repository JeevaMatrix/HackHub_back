const Payout = require("../models/Payout");
const User = require("../models/User");
const Event = require("../models/Event");
const CashfreeService = require("./cashfree");

exports.autoPayout = async (registration, payment) => {
  try {
    // 1. Load event + organizer
    const event = await Event.findById(registration.eventId);
    if (!event) {
      console.log("Event not found for payout");
      return false;
    }

    const organizer = await User.findById(event.organizerId);
    if (!organizer) {
      console.log("Organizer not found");
      return false;
    }

    if (!organizer.upiId) {
      console.log("Organizer has no UPI ID. Skipping payout.");
      return false;
    }

    // 2. Calculate payout amount
    const ticketPrice = payment.amount;
    const platformFee = 5; // TODO: make dynamic later
    const payoutAmount = ticketPrice - platformFee;

    // 3. Unique transfer ID (mandatory for Cashfree)
    const transferId = `payout_${Date.now()}_${registration._id}`;

    // 4. Send payout (via Direct Transfer)
    const payoutRes = await CashfreeService.sendUPIPayout({
      upiId: organizer.upiId,
      amount: payoutAmount,
      transferId
    });

    console.log("Payout API Response:", payoutRes);

    // 5. Extract correct fields based on Cashfree response
    const status =
      payoutRes.status === "SUCCESS" ? "completed" :
      payoutRes.status === "PENDING" ? "pending" :
      "failed";

    const referenceId =
      payoutRes.data?.referenceId ||
      payoutRes.data?.utr ||
      payoutRes.data?.acknowledgeId ||
      null;

    // 6. Save payout record
    await Payout.create({
      eventId: event._id,
      organizerId: organizer._id,
      studentId: registration.studentId,
      amountPaid: payoutAmount,
      platformFee,
      upiId: organizer.upiId,
      status,
      payoutRef: referenceId,
      transferId
    });

    return true;

  } catch (err) {
    console.error("Auto Payout Error:", err);
    return false;
  }
};
