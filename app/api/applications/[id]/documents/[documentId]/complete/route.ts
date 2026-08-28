import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BackendError, backendFetch, readBackendResponse } from "@/lib/backend";
import { readWorkerSession } from "@/lib/session";

export async function POST(_request: Request, context: { params: Promise<{ id: string; documentId: string }> }) {
  const session = readWorkerSession((await cookies()).get("liwip_worker_session")?.value);
  if (!session) return NextResponse.json({ message: "Worker session expired" }, { status: 401 });
  const { id, documentId } = await context.params;
  try {
    const response = await backendFetch(
      `/v1/applications/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/complete`,
      { method: "POST" }
    );
    return NextResponse.json(await readBackendResponse(response), { status: response.status });
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Could not confirm secure document upload";
    return NextResponse.json({ message }, { status });
  }
}
