const Payout = require("../models/Payout");
const User = require("../models/User");
const CashfreeService = require("./cashfree");

exports.autoPayout = async (registration, payment) => {
  try {
    const event = await Event.findById(registration.eventId);
    const organizer = await User.findById(event.organizerId);

    const ticketPrice = payment.amount;
    const platformFee = 5; // or dynamic %
    const payoutAmount = ticketPrice - platformFee;

    // Send payout to organizer UPI
    const payoutRes = await CashfreeService.sendUPIPayout({
      upiId: organizer.upiId,
      amount: payoutAmount
    });

    // Save payout record
    await Payout.create({
      eventId: event._id,
      organizerId: organizer._id,
      studentId: registration.studentId,
      amountPaid: payoutAmount,
      platformFee,
      upiId: organizer.upiId,
      status: payoutRes.status,
      payoutRef: payoutRes.referenceId
    });

    return true;

  } catch (err) {
    console.error("Auto Payout Error:", err);
    return false;
  }
};
