import OpenAI from "openai";
import { ensureCredits } from "./creditService.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const searchDuckDuckGo = async (query, limit = 5) => {
  const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
  if (!response.ok) {
    throw new Error("Search provider unavailable");
  }
  const data = await response.json();
  const topics = data.RelatedTopics || [];
  const results = topics
    .flatMap((item) => {
      if (item.Topics) return item.Topics;
      return [item];
    })
    .filter((item) => item.FirstURL && item.Text)
    .slice(0, limit)
    .map((item) => ({
      title: item.Text.split(" - ")[0],
      url: item.FirstURL,
      snippet: item.Text,
    }));
  return results;
};

export const runDeepResearch = async (user, query) => {
  await ensureCredits(user.id, 5);
  const sources = await searchDuckDuckGo(query, 6);

  const evidencePrompt = `You are an analyst. Extract concise factual notes from the provided sources. Return bullet points with at most three sentences each.`;
  const evidence = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: evidencePrompt },
      { role: "user", content: JSON.stringify({ query, sources }) },
    ],
    temperature: 0.2,
  });

  const reasoningPrompt = `Using the evidence, produce a final summary with:
- Direct answer to the query
- Three key insights
- List of cited sources (use markdown links). Keep responses concise.`;

  const summary = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: reasoningPrompt },
      { role: "assistant", content: evidence.choices?.[0]?.message?.content || "" },
    ],
    temperature: 0.25,
  });

  return {
    summary: summary.choices?.[0]?.message?.content || "",
    sources,
  };
};
