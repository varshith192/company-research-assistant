import { Router } from "express";
import { sendReportToDiscord } from "../../../lib/discord";
import { buildReportPdf } from "../../../lib/pdf";
import type { ApplicantInfo, ResearchResult } from "../../../lib/types";

interface DiscordRequestBody {
  botToken?: string;
  channelId?: string;
  applicant?: ApplicantInfo;
  result?: ResearchResult;
}

const router = Router();

router.post("/", async (req, res) => {
  const { botToken, channelId, applicant, result } = req.body as DiscordRequestBody;

  if (!botToken?.trim() || !channelId?.trim()) {
    res.status(400).json({ error: "Discord bot token and channel ID are required." });
    return;
  }
  if (!result?.company) {
    res.status(400).json({ error: "Missing research result" });
    return;
  }
  if (!applicant?.name?.trim() || !applicant?.email?.trim()) {
    res.status(400).json({ error: "Applicant name and email are required." });
    return;
  }

  try {
    const pdfBuffer = await buildReportPdf(result, applicant);
    await sendReportToDiscord({ botToken, channelId, applicant, result, pdfBuffer });
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send report to Discord";
    res.status(500).json({ error: message });
  }
});

export default router;
