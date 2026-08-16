import { GoogleGenAI, Type } from "@google/genai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export interface TriagedMessagePayload {
  original_message: string;
  priority: string;
  category: string;
  reason: string;
  recommended_action: string;
  draft_reply: string;
  confidence: number;
  missing_information: string[];
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function sendResponse(res: any, status: number, data: any) {
  try {
    if (!res.headersSent) {
      res.setHeader?.("Access-Control-Allow-Credentials", "true");
      res.setHeader?.("Access-Control-Allow-Origin", "*");
      res.setHeader?.("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
      res.setHeader?.(
        "Access-Control-Allow-Headers",
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
      );
      res.setHeader?.("Content-Type", "application/json");
    }

    if (typeof res.status === "function") {
      res.status(status);
      if (typeof res.json === "function") {
        return res.json(data);
      }
    } else {
      res.statusCode = status;
    }
    return res.end(JSON.stringify(data));
  } catch (err) {
    console.error("Failed to send API response:", err);
    try {
      res.statusCode = status;
      res.end(JSON.stringify(data));
    } catch {}
  }
}

async function parseRequestBody(req: any): Promise<any> {
  try {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === "object") return req.body;
      if (typeof req.body === "string" && req.body.trim()) {
        try {
          return JSON.parse(req.body);
        } catch {
          return {};
        }
      }
      return {};
    }

    if (req.readableEnded || req.complete || !req.readable) {
      return {};
    }

    return await new Promise((resolve) => {
      let data = "";
      const timer = setTimeout(() => resolve({}), 2500);
      req.on("data", (chunk: any) => {
        data += chunk;
      });
      req.on("end", () => {
        clearTimeout(timer);
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
      req.on("error", () => {
        clearTimeout(timer);
        resolve({});
      });
    });
  } catch {
    return {};
  }
}

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables, then Redeploy."
    );
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" },
      },
    });
  }
  return geminiClient;
}

let supabaseClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(url, key, { auth: { persistSession: false } });
  }
  return supabaseClient;
}

const SYSTEM_INSTRUCTION = `You are an operations triage assistant for a logistics startup. Analyse each incoming message independently.

Your job is to identify urgent operational risk while avoiding invented facts.

Priority rules:
- critical: safety incident, truck/vehicle breakdown, stranded shipment, missed pickup with immediate impact, or a major customer escalation.
- high: delivery delay, significant vendor blocker, urgent customer complaint, or an issue needing action today.
- medium: a non-critical issue that needs follow-up today.
- low: delivery confirmation, acknowledgement, routine status update, or no action required.
- needs_review: the message is ambiguous, incomplete, or cannot be safely classified.

Important rules:
- Favour recall for critical operational issues. If uncertain between low and a more serious state, use needs_review.
- Never invent order numbers, ETAs, locations, commitments, people, vehicle details, or operational facts.
- Recommended actions must be practical but framed as suggestions based only on the message.
- Draft replies must be concise, professional, and editable.
- If information is missing, ask for that information in the draft reply.
- Return JSON only. Do not include Markdown or explanatory text.`;

const VALID_PRIORITIES = new Set(["critical", "high", "medium", "low", "needs_review"]);
const VALID_CATEGORIES = new Set([
  "vehicle_breakdown",
  "delivery_delay",
  "pickup_issue",
  "vendor_issue",
  "customer_escalation",
  "delivery_confirmation",
  "routine_update",
  "other",
]);

function normalizeTriagedMessage(raw: any, fallbackMessage: string): TriagedMessagePayload {
  const original_message =
    typeof raw?.original_message === "string" && raw.original_message.trim()
      ? raw.original_message.trim()
      : fallbackMessage;

  let priority = typeof raw?.priority === "string" ? raw.priority.toLowerCase().trim() : "needs_review";
  if (!VALID_PRIORITIES.has(priority)) {
    priority = "needs_review";
  }

  let category = typeof raw?.category === "string" ? raw.category.toLowerCase().trim() : "other";
  if (!VALID_CATEGORIES.has(category)) {
    category = "other";
  }

  const reason =
    typeof raw?.reason === "string" && raw.reason.trim()
      ? raw.reason.trim()
      : "Classified based on message contents.";

  const recommended_action =
    typeof raw?.recommended_action === "string" && raw.recommended_action.trim()
      ? raw.recommended_action.trim()
      : "Review message and confirm operational details.";

  const draft_reply =
    typeof raw?.draft_reply === "string" && raw.draft_reply.trim()
      ? raw.draft_reply.trim()
      : "Acknowledged. We are reviewing this update.";

  const confidence =
    typeof raw?.confidence === "number" && !isNaN(raw.confidence)
      ? Math.min(1.0, Math.max(0.0, raw.confidence))
      : 0.85;

  const missing_information = Array.isArray(raw?.missing_information)
    ? raw.missing_information.map((item: any) => String(item).trim()).filter(Boolean)
    : [];

  return {
    original_message,
    priority,
    category,
    reason,
    recommended_action,
    draft_reply,
    confidence,
    missing_information,
  };
}

const CANDIDATE_MODELS = ["gemini-flash-latest", "gemini-3.7-flash", "gemini-3.1-flash-lite"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiTriage(messages: string[]): Promise<TriagedMessagePayload[]> {
  const ai = getGemini();
  let lastError: any = null;

  for (let mIdx = 0; mIdx < CANDIDATE_MODELS.length; mIdx++) {
    const model = CANDIDATE_MODELS[mIdx];
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const prompt = `Analyse the following ${messages.length} incoming logistics message(s) strictly adhering to the specified schema and instructions. Each message must have a corresponding analysis entry in the output array in the exact same order:\n\n${JSON.stringify(messages, null, 2)}`;

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            temperature: 0.2,
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                messages: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      original_message: { type: Type.STRING },
                      priority: {
                        type: Type.STRING,
                        enum: ["critical", "high", "medium", "low", "needs_review"],
                      },
                      category: {
                        type: Type.STRING,
                        enum: [
                          "vehicle_breakdown",
                          "delivery_delay",
                          "pickup_issue",
                          "vendor_issue",
                          "customer_escalation",
                          "delivery_confirmation",
                          "routine_update",
                          "other",
                        ],
                      },
                      reason: { type: Type.STRING },
                      recommended_action: { type: Type.STRING },
                      draft_reply: { type: Type.STRING },
                      confidence: { type: Type.NUMBER },
                      missing_information: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                    required: [
                      "original_message",
                      "priority",
                      "category",
                      "reason",
                      "recommended_action",
                      "draft_reply",
                      "confidence",
                      "missing_information",
                    ],
                  },
                },
              },
              required: ["messages"],
            },
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error("Empty response received from Gemini model.");
        }

        const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
        const parsed = JSON.parse(cleaned);

        if (!parsed || !Array.isArray(parsed.messages)) {
          throw new Error("Invalid format: expected object with 'messages' array.");
        }

        return messages.map((origMsg, index) => {
          const rawEntry =
            parsed.messages[index] || parsed.messages.find((m: any) => m.original_message === origMsg);
          return normalizeTriagedMessage(rawEntry, origMsg);
        });
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Triage] Model ${model} attempt ${attempt} failed:`, err?.message || err);
        const isUnavailable =
          err?.message?.includes("503") ||
          err?.message?.includes("high demand") ||
          err?.status === 503;
        if (attempt === 1) {
          await sleep(isUnavailable ? 1000 : 500);
        }
      }
    }
  }

  throw new Error(`All Gemini models failed: ${lastError?.message || "Service unavailable"}`);
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return sendResponse(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return sendResponse(res, 405, { error: "Method not allowed. Use POST." });
  }

  try {
    const body = await parseRequestBody(req);
    const messages = body?.messages;
    const rawInput = body?.raw_input;

    if (!Array.isArray(messages) || messages.length === 0) {
      return sendResponse(res, 400, {
        error: "Invalid payload. Expected { messages: string[], raw_input?: string } with at least 1 message.",
      });
    }

    if (messages.length > 80) {
      return sendResponse(res, 400, {
        error: "Batch limit exceeded. Maximum 80 messages per analysis run.",
      });
    }

    const rawString = typeof rawInput === "string" ? rawInput : messages.join("\n\n");
    const triagedPayloads = await callGeminiTriage(messages);
    const runId = generateUUID();
    const createdAt = new Date().toISOString();

    const formattedMessages = triagedPayloads.map((msg) => ({
      id: generateUUID(),
      run_id: runId,
      original_message: msg.original_message,
      priority: msg.priority,
      category: msg.category,
      reason: msg.reason,
      recommended_action: msg.recommended_action,
      draft_reply: msg.draft_reply,
      confidence: msg.confidence,
      missing_information: msg.missing_information,
      created_at: createdAt,
    }));

    let savedToDb = false;
    let dbError: string | undefined = undefined;

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error: runInsertError } = await supabase.from("triage_runs").insert({
          id: runId,
          raw_input: rawString,
          created_at: createdAt,
        });

        if (runInsertError) {
          throw new Error(runInsertError.message);
        }

        const { error: msgInsertError } = await supabase.from("triaged_messages").insert(
          formattedMessages.map((m) => ({
            id: m.id,
            run_id: runId,
            original_message: m.original_message,
            priority: m.priority,
            category: m.category,
            reason: m.reason,
            recommended_action: m.recommended_action,
            draft_reply: m.draft_reply,
            confidence: m.confidence,
            missing_information: m.missing_information,
            created_at: m.created_at,
          }))
        );

        if (msgInsertError) {
          throw new Error(msgInsertError.message);
        }

        savedToDb = true;
      } catch (sbErr: any) {
        console.error("Supabase insert error:", sbErr);
        savedToDb = false;
        dbError = sbErr.message || "Failed to persist to Supabase.";
      }
    } else {
      savedToDb = false;
      dbError = "Supabase environment variables (SUPABASE_URL / SUPABASE_KEY) are not set.";
    }

    return sendResponse(res, 200, {
      run_id: runId,
      created_at: createdAt,
      messages: formattedMessages,
      saved_to_db: savedToDb,
      db_error: dbError,
    });
  } catch (err: any) {
    console.error("Vercel /api/triage error:", err);
    return sendResponse(res, 500, {
      error: "Failed to triage messages with Gemini AI.",
      details: err?.message || "Internal server error occurred.",
    });
  }
}
