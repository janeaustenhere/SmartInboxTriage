import { getConfigStatus, sendApiResponse } from "../src/lib/triageCore";

export default function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    sendApiResponse(res, 200, { ok: true });
    return;
  }

  sendApiResponse(res, 200, getConfigStatus());
}
