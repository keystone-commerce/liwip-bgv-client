import { createHmac, timingSafeEqual } from "node:crypto";

function sessionSecret(): string {
  const configured = process.env.WORKER_SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("WORKER_SESSION_SECRET must be configured in production");
  return "local-worker-session-secret-change-me";
}

function signature(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createWorkerSession(phone: string): string {
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ phone, expiresAt })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function readWorkerSession(token: string | undefined): { phone: string; expiresAt: number } | null {
  if (!token) return null;
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return null;
  const expected = signature(payload);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { phone?: string; expiresAt?: number };
    if (!value.phone || !value.expiresAt || value.expiresAt < Date.now()) return null;
    return { phone: value.phone, expiresAt: value.expiresAt };
  } catch {
    return null;
  }
}
