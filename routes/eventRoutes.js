const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const eventController = require("../controllers/eventController");
const upload = require("../middleware/upload");



// ORGANIZER / ADMIN ROUTES
// router.post("/create", auth, eventController.createEvent);
router.post(
  "/create",
  auth,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "brochure", maxCount: 1 }
  ]),
  eventController.createEvent
);

router.get("/my-events", auth, eventController.getMyEvents);
router.patch(
    "/:id", 
    auth, 
    upload.fields([
        { name: "banner", maxCount: 1 },
        { name: "brochure", maxCount: 1 }
    ]),
    eventController.updateEvent
);

router.get("/:id/registrations/csv", auth, eventController.downloadRegistrationsCSV);
router.delete("/:id", auth, eventController.deleteEvent);

// PUBLIC ROUTES
router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);



module.exports = router;
