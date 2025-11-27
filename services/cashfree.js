const axios = require("axios");

const PG_BASE = process.env.CF_ENV === "PROD"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

const PAYOUT_BASE = process.env.CF_ENV === "PROD"
  ? "https://payout-api.cashfree.com"
  : "https://payout-gamma.cashfree.com";

module.exports = {

  // 1) CREATE PAYMENT ORDER
  createOrder: async ({ amount, eventId, student }) => {
    const payload = {
      order_amount: amount,
      order_currency: "INR",

      order_meta: {
        return_url: `${process.env.CLIENT_URL}/payment/success?order_id={order_id}`
      },

      customer_details: {
        customer_id: student._id.toString(),
        customer_email: student.email,
        customer_phone: student.phone
      }
    };

    const res = await axios.post(
      `${PG_BASE}/orders`,
      payload,
      {
        headers: {
          "x-client-id": process.env.CF_PG_APP_ID,
          "x-client-secret": process.env.CF_PG_SECRET_KEY,
          "x-api-version": "2025-01-01",
          "Content-Type": "application/json"
        }
      }
    );

    return res.data;
  },


  // 2) SEND UPI PAYOUT
  sendUPIPayout: async ({ upiId, amount, transferId }) => {

    // 2.1 Authenticate
    const authRes = await axios.post(
      `${PAYOUT_BASE}/payout/v1/authorize`,
      {},
      {
        headers: {
          "X-Client-Id": process.env.CF_PAYOUT_CLIENT_ID,
          "X-Client-Secret": process.env.CF_PAYOUT_SECRET_KEY
        }
      }
    );

    const token = authRes.data.data.token;

    // 2.2 Perform direct transfer
    const payload = {
      beneId: upiId,          // e.g "jeeva@upi"
      amount: amount.toString(),
      transferId: transferId || `transfer_${Date.now()}`,
      transferMode: "upi",
      remarks: "event_payout"
    };

    const res = await axios.post(
      `${PAYOUT_BASE}/payout/v1/directTransfer`,
      payload,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data;
  }
};
