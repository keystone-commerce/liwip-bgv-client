import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BackendError, backendFetch, readBackendResponse } from "@/lib/backend";
import { readWorkerSession } from "@/lib/session";

type StatusResponse = {
  client_id?: string;
  status?: "pending" | "callback_received" | "completed" | "failed" | "expired";
  status_description?: string | null;
};

export async function GET(request: Request) {
  const session = readWorkerSession((await cookies()).get("liwip_worker_session")?.value);
  if (!session) return NextResponse.json({ message: "Verify your mobile number before checking Aadhaar status" }, { status: 401 });

  const clientId = new URL(request.url).searchParams.get("client_id")?.trim();
  if (!clientId) return NextResponse.json({ message: "client_id is required" }, { status: 400 });

  try {
    const response = await backendFetch(`/v1/aadhaar/ovse/status?client_id=${encodeURIComponent(clientId)}`);
    const result = await readBackendResponse(response) as StatusResponse;
    return NextResponse.json({ clientId: result.client_id, status: result.status, description: result.status_description });
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Could not check Aadhaar verification status";
    const details = error instanceof BackendError ? error.details : undefined;
    return NextResponse.json({ message, details }, { status });
  }
}
