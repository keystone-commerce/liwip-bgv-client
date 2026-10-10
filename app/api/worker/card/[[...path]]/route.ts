import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { WORKER_TOKEN_COOKIE } from "@/lib/session";

// The worker's own Liwip BGV Card. Only these routes are forwarded; the platform key
// and the worker token stay on this server.

const GET_ROUTES = new Set(["", "live-code", "photo"]);
const POST_ROUTES = new Set(["reissue"]);

type Context = { params: Promise<{ path?: string[] }> };

async function forward(path: string, method: "GET" | "POST") {
  const token = (await cookies()).get(WORKER_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Sign in again with your mobile number" }, { status: 401 });
  try {
    const response = await backendFetch(`/v1/worker/card${path ? `/${path}` : ""}`, { method, headers: { "X-Worker-Token": token } });
    if (path === "photo" && response.ok) {
      const type = response.headers.get("content-type") ?? "";
      if (!/^image\/(jpeg|png|webp)/.test(type)) return NextResponse.json({ message: "No photo" }, { status: 404 });
      return new NextResponse(await response.arrayBuffer(), { headers: { "Content-Type": type, "Cache-Control": "private, no-store" } });
    }
    const body = await response.json().catch(() => null);
    const message = body && typeof body === "object" && "message" in body ? body.message : undefined;
    return NextResponse.json(response.ok ? body : { message: Array.isArray(message) ? message.join(". ") : message || "Something went wrong" }, {
      status: response.status,
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch {
    return NextResponse.json({ message: "The verification service is not reachable. Try again." }, { status: 503 });
  }
}

export async function GET(_request: Request, context: Context) {
  const path = ((await context.params).path ?? []).join("/");
  if (!GET_ROUTES.has(path)) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return forward(path, "GET");
}

export async function POST(_request: Request, context: Context) {
  const path = ((await context.params).path ?? []).join("/");
  if (!POST_ROUTES.has(path)) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return forward(path, "POST");
}
