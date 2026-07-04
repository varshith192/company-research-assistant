import { Router } from "express";
import { buildReportPdf } from "../../lib/pdf";
import type { ApplicantInfo, ResearchResult } from "../../lib/types";

const router = Router();

router.post("/", async (req, res) => {
  const body = req.body as { result?: ResearchResult; applicant?: ApplicantInfo };

  if (!body.result?.company) {
    res.status(400).json({ error: "Missing research result" });
    return;
  }

  try {
    const pdfBuffer = await buildReportPdf(body.result, body.applicant);
    const fileName = `${body.result.company.companyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-research-report.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate PDF";
    res.status(500).json({ error: message });
  }
});

export default router;
