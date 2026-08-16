import { sendApiResponse } from "../src/lib/triageCore";

export default function handler(req: any, res: any) {
  sendApiResponse(res, 200, {
    status: "ok",
    app: "Smart Inbox Triage",
    timestamp: new Date().toISOString(),
  });
}
