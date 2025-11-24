import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "gpt-wiki-backend" });
});

app.post("/chat", async (req, res) => {
  try {
    const { message, userId } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'Missing "message" field.' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is missing." });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are GPT-WIKI, a factual Wikipedia-style AI." },
          { role: "user", content: message }
        ],
        user: userId || "anonymous"
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(502).json({ error: data.error?.message || "OpenAI request failed" });
    }

    const reply = data?.choices?.[0]?.message?.content || "";
    res.json({ reply });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Unexpected server error." });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => console.log(`GPT-WIKI backend running on port ${PORT}`));
