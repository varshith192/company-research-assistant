import { Router } from "express";
import { runResearch } from "../../../lib/research-pipeline";
import type { ResearchRequestBody } from "../../../lib/types";

const router = Router();

router.post("/", async (req, res) => {
  const body = req.body as Partial<ResearchRequestBody>;
  const query = body.query?.trim();
  const model = body.model?.trim();

  if (!query || !model) {
    res.status(400).json({ error: "Missing query or model" });
    return;
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    for await (const event of runResearch(query, model)) {
      res.write(JSON.stringify(event) + "\n");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.write(JSON.stringify({ step: "error", message: "Research failed", error: message }) + "\n");
  } finally {
    res.end();
  }
});

export default router;
