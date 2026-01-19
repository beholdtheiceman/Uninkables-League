import { json } from "../_lib/http.js";
import { clearSession } from "../_lib/auth.js";

export default function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  clearSession(res);
  return json(res, 200, { ok: true });
}
