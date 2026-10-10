import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BackendError, backendFetch, readBackendResponse } from "@/lib/backend";
import { WORKER_TOKEN_COOKIE, createWorkerSession } from "@/lib/session";

const schema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  otp: z.string().regex(/^\d{4,8}$/)
});

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Enter the mobile number and OTP" }, { status: 400 });

  try {
    const response = await backendFetch("/v1/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data)
    });
    const result = await readBackendResponse(response) as { verified?: boolean; workerToken?: string; workerTokenExpiresAt?: number };
    if (!result.verified) return NextResponse.json({ message: "OTP verification was not confirmed" }, { status: 401 });

    const jar = await cookies();
    jar.set("liwip_worker_session", createWorkerSession(parsed.data.phone), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction(),
      maxAge: 12 * 60 * 60,
      path: "/"
    });
    // The backend's proof of OTP for this phone. Only server routes read it; the browser never sees it.
    if (result.workerToken) {
      const seconds = Math.floor(((result.workerTokenExpiresAt ?? Date.now() + 12 * 3600_000) - Date.now()) / 1000);
      jar.set(WORKER_TOKEN_COOKIE, result.workerToken, { httpOnly: true, sameSite: "lax", secure: isProduction(), maxAge: Math.max(60, seconds), path: "/api" });
    }
    return NextResponse.json({ success: true, verified: true });
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message = error instanceof Error ? error.message : "OTP verification failed";
    return NextResponse.json({ message }, { status });
  }
}
