import { NextResponse } from "next/server";
import { z } from "zod";
import { BackendError, backendFetch, readBackendResponse } from "@/lib/backend";

const schema = z.object({ phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number") });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid mobile number" }, { status: 400 });

  try {
    const response = await backendFetch("/v1/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: parsed.data.phone })
    });
    return NextResponse.json(await readBackendResponse(response));
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Could not send OTP";
    return NextResponse.json({ message }, { status });
  }
}
