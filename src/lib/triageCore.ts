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

export interface CachedRun {
  id: string;
  raw_input: string;
  created_at: string;
  messages: any[];
  saved_to_db: boolean;
}

export const localRunCache: CachedRun[] = [];

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function parseJsonBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: any) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

export function sendApiResponse(res: any, status: number, data: any) {
  res.setHeader?.("Access-Control-Allow-Credentials", "true");
  res.setHeader?.("Access-Control-Allow-Origin", "*");
  res.setHeader?.("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader?.(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  res.setHeader?.("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

// Helper to get Gemini Client lazily
let geminiClient: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables.");
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
export function getSupabaseClient(): SupabaseClient | null {
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

export const SYSTEM_INSTRUCTION = `You are an operations triage assistant for a logistics startup. Analyse each incoming message independently.

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

export const VALID_PRIORITIES = new Set(["critical", "high", "medium", "low", "needs_review"]);
export const VALID_CATEGORIES = new Set([
  "vehicle_breakdown",
  "delivery_delay",
  "pickup_issue",
  "vendor_issue",
  "customer_escalation",
  "delivery_confirmation",
  "routine_update",
  "other",
]);

export function normalizeTriagedMessage(raw: any, fallbackMessage: string): TriagedMessagePayload {
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

export const CANDIDATE_MODELS = [
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

  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!parsed || !Array.isArray(parsed.messages)) {
    throw new Error("Invalid output format: expected an object with a 'messages' array.");
  }

  return parsed;
}

export async function callGeminiTriage(messages: string[]): Promise<TriagedMessagePayload[]> {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (let mIdx = 0; mIdx < CANDIDATE_MODELS.length; mIdx++) {
    const model = CANDIDATE_MODELS[mIdx];
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

export async function processTriageRun(messages: string[], rawString: string) {
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

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error: runInsertError } = await supabase.from("triage_runs").insert({
        id: runId,
        raw_input: rawString,
        created_at: createdAt,
      });

      if (runInsertError) {
        throw new Error(`Failed to save triage run: ${runInsertError.message}`);
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

  return {
    run_id: runId,
    created_at: createdAt,
    messages: formattedMessages,
    saved_to_db: savedToDb,
    db_error: dbError,
  };
}

export function getConfigStatus() {
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const hasSupabase = !!(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );

  return {
    hasGeminiKey,
    hasSupabase,
    supabaseUrlConfigured: !!process.env.SUPABASE_URL,
  };
}

export async function getHistoryList() {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("triage_runs")
        .select("id, raw_input, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        return { runs: data, source: "supabase" };
      }
    } catch (e) {
      console.warn("Failed to fetch history from Supabase:", e);
    }
  }

  return {
    runs: localRunCache.map((r) => ({
      id: r.id,
      raw_input: r.raw_input,
      created_at: r.created_at,
      message_count: r.messages.length,
      saved_to_db: r.saved_to_db,
    })),
    source: "local_cache",
  };
}

export async function getHistoryItem(runId: string) {
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
          return {
            id: run.id,
            raw_input: run.raw_input,
            created_at: run.created_at,
            messages: msgs,
            saved_to_db: true,
          };
        }
      }
    } catch (e) {
      console.warn("Supabase fetch single run failed:", e);
    }
  }

  const cached = localRunCache.find((r) => r.id === runId);
  if (cached) {
    return cached;
  }

  return null;
}
