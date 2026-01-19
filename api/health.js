import { json } from "./_lib/http.js";

export default function handler(req, res) {
  return json(res, 200, { ok: true });
}
