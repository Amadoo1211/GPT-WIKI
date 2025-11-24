import Stripe from "stripe";
import prisma from "../db/prisma.js";
import { addCredits } from "./creditService.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const successUrl = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL}/billing/success`
  : "http://localhost:3000/billing/success";
const cancelUrl = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL}/billing/cancel`
  : "http://localhost:3000/billing/cancel";

export const createCheckoutSession = async (user, type) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  const creditPackCredits = Number(process.env.CREDIT_PACK_AMOUNT || 50);
  const subscriptionCredits = Number(process.env.SUBSCRIPTION_CREDIT_AMOUNT || 500);

  const config =
    type === "subscription"
      ? {
          mode: "subscription",
          price: process.env.STRIPE_PRICE_SUBSCRIPTION,
          credits: subscriptionCredits,
        }
      : {
          mode: "payment",
          price: process.env.STRIPE_PRICE_CREDIT_PACK,
          credits: creditPackCredits,
        };

  if (!config.price) {
    throw new Error("Stripe price ID missing");
  }

  const session = await stripe.checkout.sessions.create({
    mode: config.mode,
    line_items: [
      {
        price: config.price,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: user.email,
    metadata: {
      userId: user.id,
      productType: type === "subscription" ? "subscription" : "credit",
      credits: config.credits,
    },
  });

  await prisma.payment.create({
    data: {
      stripeSessionId: session.id,
      stripeCustomerId: session.customer?.toString() || undefined,
      type: type === "subscription" ? "SUBSCRIPTION" : "CREDIT",
      userId: user.id,
      creditsAdded: type === "subscription" ? config.credits : config.credits,
      subscriptionId: session.subscription?.toString() || undefined,
    },
  });

  return { sessionId: session.id, url: session.url };
};

const handleCompletedSession = async (event) => {
  const session = event.data.object;
  const metadata = session.metadata || {};
  const userId = metadata.userId;
  const credits = Number(metadata.credits || 0);
  const productType = metadata.productType;

  if (!userId) return;

  await prisma.payment.updateMany({
    where: { stripeSessionId: session.id },
    data: { status: "COMPLETED", stripeCustomerId: session.customer?.toString(), subscriptionId: session.subscription?.toString() },
  });

  if (productType === "credit" && credits > 0) {
    await addCredits(userId, credits);
  }

  if (productType === "subscription") {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: "active",
        stripeCustomerId: session.customer?.toString(),
      },
    });
    if (credits > 0) {
      await addCredits(userId, credits);
    }
  }
};

const handleFailedInvoice = async (event) => {
  const invoice = event.data.object;
  if (!invoice.subscription || !invoice.customer) return;
  await prisma.user.updateMany({
    where: { stripeCustomerId: invoice.customer.toString() },
    data: { subscriptionStatus: "payment_failed" },
  });
};

export const handleStripeWebhook = async (rawBody, signature) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Stripe webhook secret missing");
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed":
      await handleCompletedSession(event);
      break;
    case "invoice.payment_failed":
      await handleFailedInvoice(event);
      break;
    default:
      break;
  }

  return { received: true };
};
