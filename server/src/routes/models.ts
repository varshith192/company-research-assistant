import { Router } from "express";
import { listModels } from "../../../lib/openrouter";
import type { ModelInfo } from "../../../lib/types";

const router = Router();

let cache: { models: ModelInfo[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

router.get("/", async (_req, res) => {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    res.json({ models: cache.models });
    return;
  }

  try {
    const models = await listModels();
    cache = { models, fetchedAt: Date.now() };
    res.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch models";
    res.status(500).json({ error: message });
  }
});

export default router;
