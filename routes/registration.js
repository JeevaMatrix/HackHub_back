const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const registrationController = require("../controllers/registrationController");

// Student registers for event
router.post("/:eventId", auth, registrationController.registerForEvent);

// Cashfree webhook or internal payment confirm
router.post("/payment/success", registrationController.paymentSuccess);

// Student cancel their registration
router.put("/cancel/:registrationId", auth, registrationController.cancelRegistration);

// Get student registrations
router.get("/mine", auth, registrationController.myRegistrations);

module.exports = router;
