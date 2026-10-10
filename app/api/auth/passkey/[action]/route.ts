import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { backendFetch } from "@/lib/backend";
import { WORKER_TOKEN_COOKIE, createWorkerSession } from "@/lib/session";

// Quick sign-in with a passkey. The browser runs the WebAuthn ceremony; the backend
// issues and checks every challenge. Setup needs the worker token from OTP sign-in.

const ACTIONS = {
  "register-options": { path: "register/options", worker: true },
  "register-verify": { path: "register/verify", worker: true },
  "login-options": { path: "login/options", worker: false },
  "login-verify": { path: "login/verify", worker: false }
} as const;

const b64 = z.string().regex(/^[\w-]+=*$/).max(16_384);
// The authenticator's JSON response, passed through unchanged (it is signed).
const credential = z.object({
  id: b64,
  rawId: b64,
  type: z.literal("public-key"),
  response: z.record(z.string(), z.union([b64, z.array(z.string().max(20)).max(10), z.number(), z.null()])),
  clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
  authenticatorAttachment: z.string().max(40).nullable().optional()
}).passthrough();

const isProduction = () => process.env.NODE_ENV === "production";

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const route = ACTIONS[action as keyof typeof ACTIONS];
  if (!route) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const jar = await cookies();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (route.worker) {
    const token = jar.get(WORKER_TOKEN_COOKIE)?.value;
    if (!token) return NextResponse.json({ message: "Sign in again with your mobile number" }, { status: 401 });
    headers.set("X-Worker-Token", token);
  }

  let body: unknown = {};
  if (action === "register-options") {
    const parsed = z.object({ displayName: z.string().trim().max(64).optional() }).strict().safeParse(await request.json().catch(() => ({})));
    body = parsed.success ? parsed.data : {};
  } else if (action.endsWith("-verify")) {
    const parsed = credential.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "The passkey response is not valid" }, { status: 400 });
    body = parsed.data;
  }

  try {
    const response = await backendFetch(`/v1/worker/passkeys/${route.path}`, { method: "POST", headers, body: JSON.stringify(body) });
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      return NextResponse.json({ message: (data && typeof data.message === "string" && data.message) || "Quick sign-in did not work" }, { status: response.status });
    }
    if (action !== "login-verify") return NextResponse.json(data);

    // Signed in with a passkey: same session cookies as OTP sign-in.
    const token = String(data?.workerToken || "");
    const phone = String(data?.phone || "");
    if (!token || !/^\d{10}$/.test(phone)) return NextResponse.json({ message: "Quick sign-in did not work" }, { status: 502 });
    const seconds = Math.max(60, Math.floor((Number(data?.workerTokenExpiresAt) - Date.now()) / 1000) || 12 * 3600);
    jar.set(WORKER_TOKEN_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: isProduction(), maxAge: seconds, path: "/api" });
    jar.set("liwip_worker_session", createWorkerSession(phone), { httpOnly: true, sameSite: "lax", secure: isProduction(), maxAge: 12 * 60 * 60, path: "/" });
    return NextResponse.json({ verified: true, phone });
  } catch {
    return NextResponse.json({ message: "The verification service is not reachable. Try again." }, { status: 503 });
  }
}
