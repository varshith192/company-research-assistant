import "dotenv/config";
import express from "express";
import cors from "cors";

import researchRouter from "./routes/research";
import pdfRouter from "./routes/pdf";
import discordRouter from "./routes/discord";
import modelsRouter from "./routes/models";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/research", researchRouter);
app.use("/api/pdf", pdfRouter);
app.use("/api/discord", discordRouter);
app.use("/api/models", modelsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message?.startsWith("Origin ") && err.message.endsWith("not allowed by CORS")) {
    res.status(403).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Company Research Assistant API listening on port ${PORT}`);
});
