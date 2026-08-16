import triageHandler from "./triage";
import configHandler from "./config";
import historyHandler from "./history";
import healthHandler from "./health";

export default async function handler(req: any, res: any) {
  const url = req.url || "";
  const cleanUrl = url.split("?")[0].replace(/^\/api/, "");

  if (cleanUrl === "/triage" || cleanUrl === "/triage/") {
    return triageHandler(req, res);
  }
  if (cleanUrl === "/config" || cleanUrl === "/config/") {
    return configHandler(req, res);
  }
  if (cleanUrl.startsWith("/history")) {
    const parts = cleanUrl.split("/").filter(Boolean);
    if (parts.length > 1) {
      req.query = req.query || {};
      req.query.id = parts[1];
    }
    return historyHandler(req, res);
  }
  if (cleanUrl === "/health" || cleanUrl === "/health/" || cleanUrl === "" || cleanUrl === "/") {
    return healthHandler(req, res);
  }

  res.status(404).json({ error: `API route ${url} not found.` });
}
