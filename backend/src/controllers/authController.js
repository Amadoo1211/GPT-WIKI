import { authenticateWithGoogle, sendMagicLink, verifyMagicLink, getGoogleClientId } from "../services/authService.js";

export const requestMagicLink = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const result = await sendMagicLink(email);
    res.json(result);
  } catch (error) {
    console.error("Magic link error", error);
    res.status(500).json({ error: "Unable to send magic link" });
  }
};

export const confirmMagicLink = async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) {
      return res.status(400).json({ error: "Missing token or email" });
    }
    const { token: jwtToken, user } = await verifyMagicLink(token, email);
    res.json({ token: jwtToken, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: "idToken is required" });
    }
    const result = await authenticateWithGoogle(idToken);
    res.json(result);
  } catch (error) {
    console.error("Google auth error", error);
    res.status(401).json({ error: "Google authentication failed" });
  }
};

export const fetchGoogleClientId = (req, res) => {
  res.json(getGoogleClientId());
};
