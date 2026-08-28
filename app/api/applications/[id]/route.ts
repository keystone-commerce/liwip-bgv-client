import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BackendError, backendFetch, readBackendResponse } from "@/lib/backend";
import { readWorkerSession } from "@/lib/session";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = readWorkerSession((await cookies()).get("liwip_worker_session")?.value);
  if (!session) return NextResponse.json({ message: "Worker session expired" }, { status: 401 });
  const { id } = await context.params;
  try {
    const response = await backendFetch(`/v1/applications/${encodeURIComponent(id)}/verifications`);
    return NextResponse.json(await readBackendResponse(response));
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Could not load verification status";
    return NextResponse.json({ message }, { status });
  }
}
