import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import prisma from "../db/prisma.js";

const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const buildMagicLink = (email, token) => {
  const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000";
  const url = new URL("/auth/magic", frontendUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
};

export const generateJwt = (user) => {
  return jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const sendMagicLink = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const expiresMinutes = Number(process.env.MAGIC_LINK_EXPIRY_MINUTES || 30);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token + process.env.MAGIC_LINK_SECRET).digest("hex");
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    user = await prisma.user.create({ data: { email: normalizedEmail, credits: 10 } });
  }

  await prisma.magicLinkToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  const magicLink = buildMagicLink(normalizedEmail, token);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: normalizedEmail,
    subject: "Your GPT-Wiki PRO login link",
    text: `Use this link to sign in: ${magicLink}\nIt expires in ${expiresMinutes} minutes.`,
    html: `<p>Click to sign in to <strong>GPT-Wiki PRO</strong>:</p><p><a href="${magicLink}">Sign in</a></p><p>This link expires in ${expiresMinutes} minutes.</p>`,
  });

  return { message: "Magic link sent" };
};

export const verifyMagicLink = async (token, email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const tokenHash = crypto.createHash("sha256").update(token + process.env.MAGIC_LINK_SECRET).digest("hex");
  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash }, include: { user: true } });

  if (!record || record.consumed) {
    throw new Error("Invalid or already used magic link");
  }

  if (record.user.email !== normalizedEmail) {
    throw new Error("Email mismatch");
  }

  if (record.expiresAt < new Date()) {
    throw new Error("Magic link expired");
  }

  await prisma.magicLinkToken.update({ where: { tokenHash }, data: { consumed: true } });
  const user = record.user;
  const tokenJwt = generateJwt(user);
  return { token: tokenJwt, user };
};

export const authenticateWithGoogle = async (idToken) => {
  const ticket = await oauthClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error("Google token missing email");
  }

  const email = payload.email.toLowerCase();
  const googleId = payload.sub;

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, googleId, credits: 25, subscriptionStatus: "google-user" } });
  } else if (!user.googleId) {
    user = await prisma.user.update({ where: { id: user.id }, data: { googleId } });
  }

  const token = generateJwt(user);
  return { token, user };
};

export const getGoogleClientId = () => ({ clientId: process.env.GOOGLE_CLIENT_ID });
