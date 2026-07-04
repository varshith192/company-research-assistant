import "dotenv/config";
import express from "express";
import cors from "cors";

import researchRouter from "./routes/research";
import pdfRouter from "./routes/pdf";
import discordRouter from "./routes/discord";
import modelsRouter from "./routes/models";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// No user data or session/cookie auth in this app, and the real secrets
// (Serper/OpenRouter keys) never leave the server, so it's safe to accept
// requests from any origin rather than maintaining an allow-list.
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/research", researchRouter);
app.use("/api/pdf", pdfRouter);
app.use("/api/discord", discordRouter);
app.use("/api/models", modelsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Company Research Assistant API listening on port ${PORT}`);
});
