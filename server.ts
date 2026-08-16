import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import triageHandler from "./api/triage";
import configHandler from "./api/config";
import historyHandler from "./api/history";
import healthHandler from "./api/health";

dotenv.config();

const PORT = 3000;
const app = express();
app.use(express.json({ limit: "5mb" }));

// Health check endpoint
app.all("/api/health", (req: Request, res: Response) => {
  return healthHandler(req, res);
});

// Config inspection endpoint
app.all("/api/config", (req: Request, res: Response) => {
  return configHandler(req, res);
});

// History single run endpoint
app.all("/api/history/:id", (req: Request, res: Response) => {
  req.query = req.query || {};
  req.query.id = req.params.id;
  return historyHandler(req, res);
});

// History endpoint (recent runs)
app.all("/api/history", (req: Request, res: Response) => {
  return historyHandler(req, res);
});

// Core POST /api/triage endpoint
app.all("/api/triage", (req: Request, res: Response) => {
  return triageHandler(req, res);
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
