import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { readWorkerSession } from "@/lib/session";

const schema = z.object({
  code: z.string().trim().min(4).max(40).transform((value) => value.toUpperCase())
});

export async function POST(request: Request) {
  const session = readWorkerSession((await cookies()).get("liwip_worker_session")?.value);
  if (!session) return NextResponse.json({ valid: false, message: "Verify your mobile number before applying a payment code" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ valid: false, message: "Enter a valid payment code" }, { status: 400 });

  const configuredCodes = (process.env.WORKER_PAYMENT_CODES || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  if (!configuredCodes.length) {
    return NextResponse.json({ valid: false, message: "Payment-code service is not configured" }, { status: 503 });
  }

  if (!configuredCodes.includes(parsed.data.code)) {
    return NextResponse.json({ valid: false, message: "This payment code is invalid or expired" }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    sponsor: process.env.WORKER_PAYMENT_SPONSOR || "Employer / platform",
    message: "Verification fee covered"
  });
}
