import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

function sendResponse(res: any, status: number, data: any) {
  res.setHeader?.("Access-Control-Allow-Origin", "*");
  res.setHeader?.("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader?.(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  res.setHeader?.("Content-Type", "application/json");

  if (typeof res.status === "function") {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  return res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return sendResponse(res, 200, { ok: true });
  }

  const runId = req.query?.id || req.query?.run_id;
  const supabase = getSupabase();

  if (runId && typeof runId === "string") {
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
            return sendResponse(res, 200, {
              id: run.id,
              raw_input: run.raw_input,
              created_at: run.created_at,
              messages: msgs,
              saved_to_db: true,
            });
          }
        }
      } catch (e: any) {
        console.warn("Supabase single item lookup error:", e);
      }
    }
    return sendResponse(res, 404, { error: "Triage run not found." });
  }

  // List recent history
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("triage_runs")
        .select("id, raw_input, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        return sendResponse(res, 200, { runs: data, source: "supabase" });
      }
    } catch (e: any) {
      console.warn("Supabase list error:", e);
    }
  }

  return sendResponse(res, 200, {
    runs: [],
    source: "none",
  });
}
