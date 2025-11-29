const Event = require("../models/Event");
const jwt = require("jsonwebtoken");
const uploadService = require("../services/uploadService");

const { Parser } = require("json2csv");
const Registration = require("../models/Registration");
const User = require("../models/User");

exports.createEvent = async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin" && decoded.role !== "organizer") {
      return res.status(403).json({ message: "Only admins/organizers can create events" });
    }

    const {
      title,
      description,
      type,
      visibility,
      allowedCollegeIds,
      date,
      venue,
      pricing,
      registrationLimit,
      tags
    } = req.body;

    if (!title || !type)
      return res.status(400).json({ message: "Title and type are required" });

    if (!date || !date.start || !date.end)
      return res.status(400).json({ message: "Event start and end date required" });

    let bannerUrl = null;
    let brochureUrl = null;

    // Upload BANNER
    if (req.files?.banner) {
      const uploadRes = await uploadService.uploadImage(
        req.files.banner[0].path
      );
      bannerUrl = uploadRes.secure_url;
    }

    // Upload BROCHURE (PDF)
    if (req.files?.brochure) {
      const uploadRes = await uploadService.uploadPDF(
        req.files.brochure[0].path
      );
      brochureUrl = uploadRes.secure_url;
    }

    const eventData = {
      title,
      description,
      type,
      visibility: visibility || "public",
      organizerId: decoded.id,

      bannerUrl,
      brochureUrl,

      allowedCollegeIds: visibility === "private"
        ? allowedCollegeIds || []
        : [],

      date: {
        start: new Date(date.start),
        end: new Date(date.end)
      },

      venue,

      pricing: {
        isPaid: pricing?.isPaid || false,
        amount: pricing?.amount || 0,
        currency: pricing?.currency || "INR",
        earlyBird: {
          enabled: pricing?.earlyBird?.enabled || false,
          amount: pricing?.earlyBird?.amount || 0,
          endDate: pricing?.earlyBird?.endDate
            ? new Date(pricing.earlyBird.endDate)
            : null
        }
      },

      registrationLimit: registrationLimit || 0,
      registeredCount: 0,
      tags: tags || []
    };

    const event = await Event.create(eventData);

    return res.status(201).json({
      message: "Event created successfully",
      event
    });

  } catch (err) {
    console.error("Create Event Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// ==============================
// GET ALL EVENTS (PUBLIC)
// ==============================
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ "date.start": 1 });
    return res.json({ events });
  } catch (err) {
    console.error("Fetch Events Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET SINGLE EVENT (PUBLIC)
// ==============================
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event)
      return res.status(404).json({ message: "Event not found" });

    return res.json({ event });
  } catch (err) {
    console.error("Fetch Single Event Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// UPDATE EVENT (ORGANIZER/ADMIN)
// ==============================
exports.updateEvent = async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Only same organizer OR admin
    if (
      event.organizerId.toString() !== decoded.id &&
      decoded.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Prepare update object
    const updates = { ...req.body };

    // Update banner if uploaded
    if (req.files?.banner) {
      const uploadRes = await uploadService.uploadImage(
        req.files.banner[0].path
      );
      updates.bannerUrl = uploadRes.secure_url;
    }

    // Update brochure if uploaded
    if (req.files?.brochure) {
      const uploadRes = await uploadService.uploadPDF(
        req.files.brochure[0].path
      );
      updates.brochureUrl = uploadRes.secure_url;
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    return res.json({
      message: "Event updated",
      event: updatedEvent
    });

  } catch (err) {
    console.error("Update Event Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// ==============================
// DELETE EVENT (ORGANIZER/ADMIN)
// ==============================
exports.deleteEvent = async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Only creator or admin
    if (event.organizerId.toString() !== decoded.id && decoded.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    await event.deleteOne();

    return res.json({ message: "Event deleted" });

  } catch (err) {
    console.error("Delete Event Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

//organizer's events
exports.getMyEvents = async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.accessToken, process.env.JWT_SECRET);
    const events = await Event.find({ organizerId: decoded.id })
      .sort({ "date.start": -1 });

    return res.json({ events });

  } catch (err) {
    console.error("Organizer Events Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.downloadRegistrationsCSV = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    const event = await Event.findById(eventId);

    if (!event) return res.status(404).send("Event not found");

    if (event.organizerId.toString() !== userId)
      return res.status(403).send("Not allowed");

    // 1. Fetch all registrations
    const registrations = await Registration.find({ eventId });

    // 2. Map with student details
    const data = [];
    for (const r of registrations) {
      const student = await User.findById(r.studentId);

      data.push({
        name: student.name,
        email: student.email,
        phone: student.phone,
        registeredAt: r.createdAt,
        paymentStatus: r.paymentStatus,
      });
    }

    // 3. Convert to CSV
    const fields = ["name", "email", "phone", "registeredAt", "paymentStatus"];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    // 4. Send as file
    const filename = `${event.title.replace(/\s+/g, "_")}_registrations.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    res.send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
