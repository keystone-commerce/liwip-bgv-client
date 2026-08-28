import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BackendError, backendFetch, readBackendResponse } from "@/lib/backend";
import { readWorkerSession } from "@/lib/session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = readWorkerSession((await cookies()).get("liwip_worker_session")?.value);
  if (!session) return NextResponse.json({ message: "Worker session expired" }, { status: 401 });
  const { id } = await context.params;
  try {
    const payload = await request.json();
    const response = await backendFetch(`/v1/applications/${encodeURIComponent(id)}/documents/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return NextResponse.json(await readBackendResponse(response), { status: response.status });
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Could not prepare secure document upload";
    return NextResponse.json({ message }, { status });
  }
}
