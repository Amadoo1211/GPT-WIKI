import { createCheckoutSession, handleStripeWebhook } from "../services/billingService.js";

export const createSession = async (req, res) => {
  try {
    const { type } = req.body || {};
    const session = await createCheckoutSession(req.user, type === "subscription" ? "subscription" : "credit");
    res.json(session);
  } catch (error) {
    console.error("Stripe session error", error);
    res.status(400).json({ error: error.message });
  }
};

export const webhook = async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];
    const result = await handleStripeWebhook(req.rawBody, signature);
    res.json(result);
  } catch (error) {
    console.error("Webhook error", error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};
