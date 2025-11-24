import { runDeepResearch } from "../services/researchService.js";

export const handleDeepResearch = async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    const result = await runDeepResearch(req.user, query);
    res.json(result);
  } catch (error) {
    console.error("Deep research error", error);
    if (error.message === "Insufficient credits") {
      return res.status(402).json({ error: "Not enough credits" });
    }
    res.status(500).json({ error: "Deep research failed" });
  }
};
