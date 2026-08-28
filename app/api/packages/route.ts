import { NextResponse } from "next/server";
import { BackendError, backendFetch, readBackendResponse } from "@/lib/backend";

export async function GET() {
  try {
    const response = await backendFetch("/v1/packages");
    return NextResponse.json(await readBackendResponse(response));
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Could not reach the verification backend";
    return NextResponse.json({ message }, { status });
  }
}
