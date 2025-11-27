const Event = require("../models/Event");
const Registration = require("../models/Registration");

// ===================== REGISTER FOR EVENT =====================
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user.id; // from auth middleware

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Check registration limit
    if (event.registrationLimit > 0 && event.registeredCount >= event.registrationLimit) {
      return res.status(400).json({ message: "Registration full" });
    }

    // Prevent duplicate registration
    const existing = await Registration.findOne({ eventId, studentId });
    if (existing)
      return res.status(400).json({ message: "Already registered" });

    const regObj = {
      eventId,
      studentId,
      status: "registered",
      paymentStatus: "not_required"
    };

    // If paid event -> mark pending payment
    if (event.pricing.isPaid) {
      regObj.status = "pending";
      regObj.paymentStatus = "pending";
    }

    const registration = await Registration.create(regObj);

    // Update registered count only if free event
    if (!event.pricing.isPaid) {
      event.registeredCount += 1;
      event.registeredStudents.push(studentId);
      await event.save();
    }

    return res.json({
      message: "Registration Successful",
      registration
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ===================== CONFIRM PAYMENT (WEBHOOK CALL) =====================
exports.paymentSuccess = async (req, res) => {
  try {
    const { registrationId, paymentId } = req.body;

    const reg = await Registration.findById(registrationId).populate("eventId");
    if (!reg) return res.status(404).json({ message: "Registration not found" });

    reg.paymentId = paymentId;
    reg.paymentStatus = "paid";
    reg.status = "registered";
    await reg.save();

    // Update event stats
    const event = await Event.findById(reg.eventId._id);
    event.registeredCount += 1;
    event.registeredStudents.push(reg.studentId);
    await event.save();

    return res.json({ message: "Payment confirmed" });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Payment confirm error" });
  }
};

// ===================== CANCEL REGISTRATION =====================
exports.cancelRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const studentId = req.user.id;

    const reg = await Registration.findOne({
      _id: registrationId,
      studentId
    });

    if (!reg) return res.status(404).json({ message: "Registration not found" });

    reg.status = "cancelled";
    await reg.save();

    return res.json({ message: "Registration cancelled" });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ===================== LIST USER’S REGISTRATIONS =====================
exports.myRegistrations = async (req, res) => {
  try {
    const studentId = req.user.id;

    const regs = await Registration.find({ studentId })
      .populate("eventId");

    return res.json(regs);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStatus = async (req, res) => {
  const registration = await Registration.findOne({ orderId: req.params.orderId });
  if (!registration) return res.status(404).json({ message: "Not found" });

  return res.json({ status: registration.status });
};
