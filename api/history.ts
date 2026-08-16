import { getHistoryList, getHistoryItem } from "../src/lib/triageCore";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const runId = req.query?.id || req.query?.run_id;

  if (runId && typeof runId === "string") {
    const item = await getHistoryItem(runId);
    if (!item) {
      res.status(404).json({ error: "Triage run not found." });
      return;
    }
    res.status(200).json(item);
    return;
  }

  const history = await getHistoryList();
  res.status(200).json(history);
}
