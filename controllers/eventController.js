const Event = require("../models/Event");
const jwt = require("jsonwebtoken");

exports.createEvent = async (req, res) => {
  try {
    const token = req.cookies.accessToken;

    if (!token)
      return res.status(401).json({ message: "Not authenticated" });

    // Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Only admin or organizer role
    if (decoded.role !== "admin" && decoded.role !== "organizer") {
      return res.status(403).json({ message: "Only admins/organizers can create events" });
    }

    // Extract event fields
    const {
      title,
      description,
      bannerUrl,
      type,
      visibility,
      allowedCollegeIds,
      date,
      venue,
      pricing,
      registrationLimit,
      tags
    } = req.body;

    // Required validations
    if (!title || !type)
      return res.status(400).json({ message: "Title and type are required" });

    if (!date || !date.start || !date.end)
      return res.status(400).json({ message: "Event start and end date required" });

    // Create event object
    const eventData = {
      title,
      description,
      bannerUrl,

      organizerId: decoded.id, // from token

      type,
      visibility: visibility || "public",

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
      registeredStudents: [],

      tags: tags || []
    };

    // Save event
    const event = await Event.create(eventData);

    return res.status(201).json({
      message: "Event created successfully",
      event
    });

  } catch (err) {
    console.error("Create Event Error:", err);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    res.status(500).json({ message: "Server error" });
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

    // Only organizer who created it OR admin
    if (event.organizerId.toString() !== decoded.id && decoded.role !== "organizer") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    return res.json({ event: updated });

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
