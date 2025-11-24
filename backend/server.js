const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Railway compatible
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gpt-wiki-backend' });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, userId } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "message" field.' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });
    }

    // API OpenAI 2025 correct
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: "You are GPT-WIKI, a simple, concise Wikipedia-style assistant."
          },
          {
            role: "user",
            content: message
          }
        ],
        user: userId || "anonymous"
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const errorMessage = errorPayload.error?.message || 'OpenAI API request failed.';
      return res.status(502).json({ error: errorMessage });
    }

    const data = await response.json();
    const reply = data?.output_text || "";

    res.json({ reply });

  } catch (error) {
    console.error("Error handling /chat request:", error);
    res.status(500).json({ error: "Unexpected server error." });
  }
});

// Default 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GPT-WIKI backend running on port ${PORT}`);
});
