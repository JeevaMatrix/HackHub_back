const axios = require("axios");
const crypto = require('crypto');
const fs = require('fs');

const PG_BASE = process.env.CF_ENV === "PROD"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

const PAYOUT_BASE = process.env.CF_ENV === "PROD"
  ? "https://payout-api.cashfree.com/payouts/v2"
  : "https://sandbox.cashfree.com/payouts/v2";


function generateSignature() {
  const clientId = process.env.CF_PAYOUT_CLIENT_ID;
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp
  
  // Combine clientId and timestamp
  const dataToEncrypt = `${clientId}.${timestamp}`;
  
  // Read the public key file
  const publicKey = fs.readFileSync(process.env.PUBLIC_KEY_PATH, 'utf8');
  
  // Encrypt using RSA with OAEP padding
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha1'
    },
    Buffer.from(dataToEncrypt)
  );
  
  // Return base64 encoded signature
  return encrypted.toString('base64');
}

module.exports = {

  // 1) PAYMENT GATEWAY: CREATE ORDER
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

  // 2) PAYOUTS V2: Create Beneficiary (UPI support)
  createBeneficiary: async ({ beneId, name, email, phone, upiId }) => {
    return axios.post(
      `${PAYOUT_BASE}/beneficiaries`,
      {
        beneficiary_id: beneId,
        name,
        email,
        phone,
        bank_details: {
          vpa: upiId
        }
      },
      {
        headers: {
          "X-Cashfree-Client-Id": process.env.CF_PAYOUT_CLIENT_ID,
          "X-Cashfree-Client-Secret": process.env.CF_PAYOUT_SECRET_KEY,
          "X-Cf-Signature": generateSignature(),
          "Content-Type": "application/json"
        }
      }
    );
  },

  // 3) PAYOUTS V2: Standard UPI Transfer
  sendUPIPayout: async ({ beneId, amount, transferId }) => {
    const res = await axios.post(
      `${PAYOUT_BASE}/transfers`,
      {
        transfer_id: transferId || `payout_${Date.now()}`,
        amount,
        currency: "INR",
        transfer_mode: "upi",
        beneficiary_id: beneId,
        narration: "event payout"
      },
      {
      headers: {
        "X-Client-Id": process.env.CF_PAYOUT_CLIENT_ID,
        "X-Client-Secret": process.env.CF_PAYOUT_SECRET_KEY,
        "X-Cf-Signature": generateSignature(),
        "Content-Type": "application/json"
      }
      }
    );

    return res.data;
  },
};
