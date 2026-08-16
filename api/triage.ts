import type { IncomingMessage, ServerResponse } from "http";
import { processTriageRun } from "../src/lib/triageCore";

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // use as is
      }
    }

    const messages = body?.messages;
    const rawInput = body?.raw_input;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        error: "Invalid payload. Expected { messages: string[], raw_input?: string } with at least 1 message.",
      });
      return;
    }

    const rawString = typeof rawInput === "string" ? rawInput : messages.join("\n\n");
    const result = await processTriageRun(messages, rawString);
    res.status(200).json(result);
  } catch (err: any) {
    console.error("Vercel /api/triage handler error:", err);
    res.status(500).json({
      error: "Failed to analyze messages with Gemini AI. Please verify input and try again.",
      details: err?.message || "Service temporarily unavailable",
    });
  }
}
