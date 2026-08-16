export default function handler(_req: any, res: any) {
  res.setHeader?.("Access-Control-Allow-Origin", "*");
  res.setHeader?.("Content-Type", "application/json");

  const payload = {
    status: "ok",
    app: "Smart Inbox Triage",
    timestamp: new Date().toISOString(),
  };

  if (typeof res.status === "function") {
    return res.status(200).json(payload);
  }
  res.statusCode = 200;
  return res.end(JSON.stringify(payload));
}
