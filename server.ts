import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  processTriageRun,
  getConfigStatus,
  getHistoryList,
  getHistoryItem,
} from "./src/lib/triageCore";

dotenv.config();

const PORT = 3000;
const app = express();
app.use(express.json({ limit: "5mb" }));

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    app: "Smart Inbox Triage",
    timestamp: new Date().toISOString(),
  });
});

// Config inspection endpoint
app.get("/api/config", (_req: Request, res: Response) => {
  res.json(getConfigStatus());
});

// Core POST /api/triage endpoint
app.post("/api/triage", async (req: Request, res: Response) => {
  try {
    const { messages, raw_input } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        error: "Invalid request payload. Expected an array of messages.",
      });
      return;
    }

    if (messages.length > 80) {
      res.status(400).json({
        error: "Batch limit exceeded. Maximum 80 messages per analysis run.",
      });
      return;
    }

    const rawString = typeof raw_input === "string" ? raw_input : messages.join("\n\n");
    const result = await processTriageRun(messages, rawString);
    res.json(result);
  } catch (err: any) {
    console.error("Triage endpoint error:", err);
    res.status(500).json({
      error: "Failed to analyze messages with Gemini AI. Please verify input and try again.",
      details: err?.message || "Service temporarily busy",
    });
  }
});

// History endpoint (recent runs)
app.get("/api/history", async (_req: Request, res: Response) => {
  try {
    const result = await getHistoryList();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to retrieve triage history." });
  }
});

// History single run endpoint
app.get("/api/history/:id", async (req: Request, res: Response) => {
  const runId = req.params.id;
  try {
    const item = await getHistoryItem(runId);
    if (item) {
      res.json(item);
      return;
    }
    res.status(404).json({ error: "Triage run not found." });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to load triage run." });
  }
});

// Vite Middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Inbox Triage server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
