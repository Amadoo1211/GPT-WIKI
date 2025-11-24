import { chatWithModel } from "../services/chatService.js";

export const handleChat = async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    const result = await chatWithModel(req.user, message);
    res.json(result);
  } catch (error) {
    console.error("Chat error", error);
    if (error.message === "Insufficient credits") {
      return res.status(402).json({ error: "Not enough credits" });
    }
    res.status(500).json({ error: "Chat request failed" });
  }
};
