export default function handler(req: any, res: any) {
  res.setHeader?.("Access-Control-Allow-Origin", "*");
  res.setHeader?.("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader?.(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  res.setHeader?.("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    if (typeof res.status === "function") {
      return res.status(200).json({ ok: true });
    }
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true }));
  }

  const hasGeminiKey = !!(
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY
  );
  const hasSupabase = !!(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );

  const payload = {
    hasGeminiKey,
    hasSupabase,
    supabaseUrlConfigured: !!process.env.SUPABASE_URL,
  };

  if (typeof res.status === "function") {
    return res.status(200).json(payload);
  }
  res.statusCode = 200;
  return res.end(JSON.stringify(payload));
}
