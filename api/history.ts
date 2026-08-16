import { getHistoryList, getHistoryItem, sendApiResponse } from "../src/lib/triageCore";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    sendApiResponse(res, 200, { ok: true });
    return;
  }

  const runId = req.query?.id || req.query?.run_id;

  if (runId && typeof runId === "string") {
    try {
      const item = await getHistoryItem(runId);
      if (!item) {
        sendApiResponse(res, 404, { error: "Triage run not found." });
        return;
      }
      sendApiResponse(res, 200, item);
      return;
    } catch (e: any) {
      sendApiResponse(res, 500, { error: e?.message || "Failed to load triage run." });
      return;
    }
  }

  try {
    const history = await getHistoryList();
    sendApiResponse(res, 200, history);
  } catch (e: any) {
    sendApiResponse(res, 500, { error: e?.message || "Failed to fetch history." });
  }
}
