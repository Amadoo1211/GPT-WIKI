import OpenAI from "openai";
import { ensureCredits } from "./creditService.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const chatWithModel = async (user, message) => {
  await ensureCredits(user.id, 1);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are GPT-Wiki PRO, a factual, concise assistant that cites sources when possible." },
      { role: "user", content: message },
    ],
    user: user.id,
    temperature: 0.3,
  });

  const reply = completion.choices?.[0]?.message?.content || "";
  return { reply };
};
