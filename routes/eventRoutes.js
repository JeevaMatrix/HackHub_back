const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const eventController = require("../controllers/eventController");



// ORGANIZER / ADMIN ROUTES
router.post("/create", auth, eventController.createEvent);
router.get("/my-events", auth, eventController.getMyEvents);
router.put("/:id", auth, eventController.updateEvent);
router.delete("/:id", auth, eventController.deleteEvent);

// PUBLIC ROUTES
router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);



module.exports = router;
