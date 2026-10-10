import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { backendFetch } from "@/lib/backend";
import { WORKER_TOKEN_COOKIE } from "@/lib/session";

// The worker's own case. The browser calls these routes; only this server holds the
// platform API key and the worker token, and only the routes below are forwarded.

const text = (max: number) => z.string().trim().max(max);
const CHECK_KINDS = ["pan", "driving_license", "rc_v2", "voter_id", "passport", "employment_history", "ecourts_search", "face"] as const;

const JSON_ROUTES: Record<string, { method: "PUT" | "POST"; body?: z.ZodTypeAny }> = {
  name: { method: "PUT", body: z.object({ fullName: text(80) }).strict() },
  checks: { method: "PUT", body: z.object({ checks: z.array(text(40)).min(1).max(12) }).strict() },
  details: { method: "PUT", body: z.object({ fullName: text(80), dateOfBirth: text(10), fatherName: text(80), address: text(300) }).partial().strict() },
  consent: { method: "POST", body: z.object({ textVersion: text(40), items: z.array(text(30)).max(12) }).strict() },
  "identity/aadhaar/start": { method: "POST" },
  "identity/digilocker/start": { method: "POST" },
  "identity/aadhaar/complete": { method: "POST" }
};
const CHECK_INPUT = z.record(z.string().max(40), text(120)).refine((value) => Object.keys(value).length <= 4, "Too many fields");

type Context = { params: Promise<{ path?: string[] }> };

async function forward(path: string, init: RequestInit) {
  const token = (await cookies()).get(WORKER_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Sign in again with your mobile number" }, { status: 401 });
  try {
    const headers = new Headers(init.headers);
    headers.set("X-Worker-Token", token);
    const response = await backendFetch(`/v1/worker/case${path ? `/${path}` : ""}`, { ...init, headers });
    const body = await response.json().catch(() => null);
    const message = body && typeof body === "object" && "message" in body ? body.message : undefined;
    // Pass the case through; on errors pass only the message, never backend internals.
    return NextResponse.json(response.ok ? body : { message: Array.isArray(message) ? message.join(". ") : message || "Something went wrong" }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "The verification service is not reachable. Try again." }, { status: 503 });
  }
}

export async function GET(_request: Request, context: Context) {
  const path = (await context.params).path ?? [];
  if (path.length) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return forward("", { method: "GET" });
}

async function write(request: Request, context: Context, method: "PUT" | "POST") {
  const path = ((await context.params).path ?? []).join("/");

  const check = /^checks\/([a-z_]+)$/.exec(path);
  if (check && method === "POST") {
    const kind = check[1];
    if (!(CHECK_KINDS as readonly string[]).includes(kind)) return NextResponse.json({ message: "Unknown check" }, { status: 404 });
    if (kind === "face") {
      const form = await request.formData().catch(() => null);
      const selfie = form?.get("selfie");
      if (!(selfie instanceof File) || selfie.size === 0 || selfie.size > 5 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(selfie.type)) {
        return NextResponse.json({ message: "Take a clear photo (JPEG or PNG, up to 5 MB)" }, { status: 400 });
      }
      const outgoing = new FormData();
      outgoing.set("selfie", selfie, selfie.name || "selfie.jpg");
      return forward(path, { method, body: outgoing });
    }
    const parsed = CHECK_INPUT.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Check the details you entered" }, { status: 400 });
    return forward(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
  }

  const route = JSON_ROUTES[path];
  if (!route || route.method !== method) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!route.body) return forward(path, { method });
  const parsed = route.body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check the details you entered" }, { status: 400 });
  return forward(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
}

export async function PUT(request: Request, context: Context) {
  return write(request, context, "PUT");
}

export async function POST(request: Request, context: Context) {
  return write(request, context, "POST");
}
