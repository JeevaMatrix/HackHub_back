const axios = require("axios");

// BASE URLs
const PG_BASE = process.env.CF_ENV === "PROD"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

const PAYOUT_BASE = process.env.CF_ENV === "PROD"
  ? "https://payout-api.cashfree.com"
  : "https://payout-gamma.cashfree.com";

module.exports = {

  // -------------------------
  // 1. PAYMENT GATEWAY ORDER
  // -------------------------
  createOrder: async ({ amount, eventId, studentId }) => {
    const payload = {
      order_amount: amount,
      order_currency: "INR",
      order_meta: {
        return_url: `${process.env.CLIENT_URL}/payment/success?order_id={order_id}`
      },
      customer_details: {
        customer_id: studentId,
        customer_email: "student@example.com"
      }
    };

    const res = await axios.post(
      `${PG_BASE}/orders`,
      payload,
      {
        headers: {
          "x-client-id": process.env.CF_PG_APP_ID,
          "x-client-secret": process.env.CF_PG_SECRET_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data;
  },

  // -------------------------
  // 2. PAYOUT TO ORGANIZER
  // -------------------------
  sendUPIPayout: async ({ upiId, amount }) => {
    const payload = {
      upi_id: upiId,
      amount: amount,
      purpose: "event_payout",
    };

    const res = await axios.post(
      `${PAYOUT_BASE}/v1/upi`,
      payload,
      {
        headers: {
          "x-client-id": process.env.CF_PAYOUT_CLIENT_ID,
          "x-client-secret": process.env.CF_PAYOUT_SECRET_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data;
  }
};
