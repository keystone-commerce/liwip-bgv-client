import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl = process.env.VERIFICATION_API_URL || "http://localhost:3001";
  try {
    const response = await fetch(`${backendUrl}/health`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error("Backend health check failed");
    return NextResponse.json({ status: "ok", service: "liwip-bgv-worker-portal", backend: "connected" });
  } catch {
    return NextResponse.json({ status: "degraded", service: "liwip-bgv-worker-portal", backend: "unavailable" }, { status: 503 });
  }
}
