import { processTriageRun, parseJsonBody, sendApiResponse } from "../src/lib/triageCore";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    sendApiResponse(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST") {
    sendApiResponse(res, 405, { error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const messages = body?.messages;
    const rawInput = body?.raw_input;

    if (!Array.isArray(messages) || messages.length === 0) {
      sendApiResponse(res, 400, {
        error: "Invalid payload. Expected { messages: string[], raw_input?: string } with at least 1 message.",
      });
      return;
    }

    if (messages.length > 80) {
      sendApiResponse(res, 400, {
        error: "Batch limit exceeded. Maximum 80 messages per analysis run.",
      });
      return;
    }

    const rawString = typeof rawInput === "string" ? rawInput : messages.join("\n\n");
    const result = await processTriageRun(messages, rawString);
    sendApiResponse(res, 200, result);
  } catch (err: any) {
    console.error("Vercel /api/triage handler error:", err);
    sendApiResponse(res, 500, {
      error: "Failed to analyze messages with Gemini AI.",
      details: err?.message || "Internal server error occurred.",
    });
  }
}
