const Payout = require("../models/Payout");
const User = require("../models/User");
const Event = require("../models/Event");
const CashfreeService = require("./cashfree");

exports.autoPayout = async (registration, payment) => {
  try {
    // 1. Load event + organizer
    const event = await Event.findById(registration.eventId);
    if (!event) return false;

    const organizer = await User.findById(event.organizerId);
    if (!organizer) return false;

    if (!organizer.beneId) {
      console.log("Organizer missing beneId. Cannot payout.");
      return false;
    }

    // 2. Calculate payout
    const ticketPrice = payment.amount;
    const platformFee = 5;
    const payoutAmount = ticketPrice - platformFee;

    // 3. Unique transfer ID
    const transferId = `payout_${Date.now()}_${registration._id}`;

    // 4. Call NEW V2 payout function
    const payoutRes = await CashfreeService.sendUPIPayout({
      beneId: organizer.beneId,
      amount: payoutAmount,
      transferId
    });

    console.log("Payout V2 Response:", payoutRes);

    // 5. Extract V2 fields
    const transferStatus = payoutRes.transfer?.status || "FAILED";

    const status =
      transferStatus === "SUCCESS"
        ? "completed"
        : transferStatus === "PENDING"
        ? "pending"
        : "failed";

    const referenceId =
      payoutRes.transfer?.utr ||
      payoutRes.transfer?.reference_id ||
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
    console.error("Auto Payout Error:", err.response?.data || err);
    return false;
  }
};
