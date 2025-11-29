const router = require("express").Router();
const paymentController = require("../controllers/paymentController");

router.post("/organizer", paymentController.manualPayout); // optional

module.exports = router;
