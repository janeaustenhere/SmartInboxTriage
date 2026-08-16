import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;
const app = express();
app.use(express.json({ limit: "5mb" }));

// In-memory fallback cache for hackathon/preview persistence when Supabase is not connected
interface CachedRun {
  id: string;
  raw_input: string;
  created_at: string;
  messages: any[];
  saved_to_db: boolean;
}
const localRunCache: CachedRun[] = [];

// Helper to get Gemini Client lazily
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Helper to get Supabase Client lazily
let supabaseClient: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false },
    });
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

interface TriagedMessagePayload {
  original_message: string;
  priority: string;
  category: string;
  reason: string;
  recommended_action: string;
  draft_reply: string;
  confidence: number;
  missing_information: string[];
}

function normalizeTriagedMessage(raw: any, fallbackMessage: string): TriagedMessagePayload {
  const original_message = typeof raw?.original_message === "string" && raw.original_message.trim() 
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

  const reason = typeof raw?.reason === "string" && raw.reason.trim()
    ? raw.reason.trim()
    : "Classified based on message contents.";

  const recommended_action = typeof raw?.recommended_action === "string" && raw.recommended_action.trim()
    ? raw.recommended_action.trim()
    : "Review message and confirm operational details.";

  const draft_reply = typeof raw?.draft_reply === "string" && raw.draft_reply.trim()
    ? raw.draft_reply.trim()
    : "Acknowledged. We are reviewing this update.";

  const confidence = typeof raw?.confidence === "number" && !isNaN(raw.confidence)
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

const CANDIDATE_MODELS = [
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite"
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeGeminiWithModel(ai: GoogleGenAI, modelName: string, messages: string[]): Promise<any> {
  const prompt = `Analyse the following ${messages.length} incoming logistics message(s) strictly adhering to the specified schema and instructions. Each message must have a corresponding analysis entry in the output array in the exact same order:

${JSON.stringify(messages, null, 2)}`;

  const response = await ai.models.generateContent({
    model: modelName,
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
    throw new Error("Empty response received from Gemini AI model.");
  }

  // Parse JSON
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!parsed || !Array.isArray(parsed.messages)) {
    throw new Error("Invalid output format: expected an object with a 'messages' array.");
  }

  return parsed;
}

async function callGeminiTriage(messages: string[]): Promise<TriagedMessagePayload[]> {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (let mIdx = 0; mIdx < CANDIDATE_MODELS.length; mIdx++) {
    const model = CANDIDATE_MODELS[mIdx];
    // Attempt up to 2 tries per model with backoff
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const parsed = await executeGeminiWithModel(ai, model, messages);
        return messages.map((origMsg, index) => {
          const rawEntry = parsed.messages[index] || parsed.messages.find((m: any) => m.original_message === origMsg);
          return normalizeTriagedMessage(rawEntry, origMsg);
        });
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Triage] Model ${model} attempt ${attempt} failed:`, err?.message || err);
        const isUnavailable = err?.message?.includes("503") || err?.message?.includes("high demand") || err?.status === 503;
        if (attempt === 1) {
          await sleep(isUnavailable ? 1000 : 500);
        }
      }
    }
  }

  throw new Error(`All Gemini models were unavailable or failed: ${lastError?.message || "Unknown error"}`);
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// App configuration status
app.get("/api/config", (_req: Request, res: Response) => {
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const hasSupabase = !!(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );

  res.json({
    hasGeminiKey,
    hasSupabase,
    supabaseUrlConfigured: !!process.env.SUPABASE_URL,
  });
});

// Main Triage Endpoint
app.post("/api/triage", async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, raw_input } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Validation error: Please provide at least one message." });
      return;
    }

    if (messages.length > 80) {
      res.status(400).json({ error: "Validation error: Maximum 80 messages allowed per batch." });
      return;
    }

    const rawString = typeof raw_input === "string" ? raw_input : messages.join("\n");
    if (rawString.length > 12000) {
      res.status(400).json({ error: "Validation error: Input exceeds maximum limit of 12,000 characters." });
      return;
    }

    // Step 1: Gemini AI Analysis with multi-model fallback and backoff retry
    let triagedPayloads: TriagedMessagePayload[];
    try {
      triagedPayloads = await callGeminiTriage(messages);
    } catch (err: any) {
      console.error("Gemini triage analysis failed:", err);
      res.status(500).json({
        error: "Failed to analyze messages with Gemini AI. Please verify input and try again.",
        details: err?.message || "Service temporarily busy",
      });
      return;
    }

    const runId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const formattedMessages = triagedPayloads.map((msg) => ({
      id: crypto.randomUUID(),
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

    // Step 2: Supabase Persistence
    let savedToDb = false;
    let dbError: string | undefined = undefined;

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Insert run
        const { error: runInsertError } = await supabase.from("triage_runs").insert({
          id: runId,
          raw_input: rawString,
          created_at: createdAt,
        });

        if (runInsertError) {
          throw new Error(`Failed to save triage run: ${runInsertError.message}`);
        }

        // Insert messages
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
          throw new Error(`Failed to save triaged messages: ${msgInsertError.message}`);
        }

        savedToDb = true;
      } catch (sbErr: any) {
        console.error("Supabase persistence failed:", sbErr);
        savedToDb = false;
        dbError = sbErr.message || "Supabase database insert failed.";
      }
    } else {
      savedToDb = false;
      dbError = "Supabase credentials (SUPABASE_URL / SUPABASE_KEY) are not configured in environment.";
    }

    // Save in local memory cache as fallback
    localRunCache.unshift({
      id: runId,
      raw_input: rawString,
      created_at: createdAt,
      messages: formattedMessages,
      saved_to_db: savedToDb,
    });
    if (localRunCache.length > 20) {
      localRunCache.pop();
    }

    res.json({
      run_id: runId,
      created_at: createdAt,
      messages: formattedMessages,
      saved_to_db: savedToDb,
      db_error: dbError,
    });
  } catch (err: any) {
    console.error("Triage endpoint error:", err);
    res.status(500).json({
      error: "An unexpected server error occurred during triage analysis.",
      details: err.message,
    });
  }
});

// Recent History Endpoint
app.get("/api/history", async (_req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("triage_runs")
        .select("id, raw_input, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        res.json({ runs: data, source: "supabase" });
        return;
      }
    } catch (e) {
      console.warn("Failed to fetch history from Supabase:", e);
    }
  }

  // Fallback to local memory cache
  res.json({
    runs: localRunCache.map((r) => ({
      id: r.id,
      raw_input: r.raw_input,
      created_at: r.created_at,
      message_count: r.messages.length,
      saved_to_db: r.saved_to_db,
    })),
    source: "local_cache",
  });
});

// Fetch single run with messages
app.get("/api/history/:runId", async (req: Request, res: Response): Promise<void> => {
  const { runId } = req.params;
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: run, error: runErr } = await supabase
        .from("triage_runs")
        .select("*")
        .eq("id", runId)
        .single();

      if (!runErr && run) {
        const { data: msgs, error: msgErr } = await supabase
          .from("triaged_messages")
          .select("*")
          .eq("run_id", runId)
          .order("created_at", { ascending: true });

        if (!msgErr && msgs) {
          res.json({
            id: run.id,
            raw_input: run.raw_input,
            created_at: run.created_at,
            messages: msgs,
            saved_to_db: true,
          });
          return;
        }
      }
    } catch (e) {
      console.warn("Supabase fetch single run failed:", e);
    }
  }

  // Fallback to local cache
  const cached = localRunCache.find((r) => r.id === runId);
  if (cached) {
    res.json(cached);
    return;
  }

  res.status(404).json({ error: "Triage run not found." });
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
