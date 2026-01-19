import jwt from "jsonwebtoken";
import cookie from "cookie";

const COOKIE_NAME = "ulh_session";

export function setSession(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
  const serialized = cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  res.setHeader("Set-Cookie", serialized);
}

export function clearSession(res) {
  const serialized = cookie.serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  res.setHeader("Set-Cookie", serialized);
}

export function getSession(req) {
  try {
    const parsed = cookie.parse(req.headers?.cookie || "");
    const token = parsed[COOKIE_NAME];
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}
