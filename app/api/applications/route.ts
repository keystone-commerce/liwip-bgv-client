import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BackendError, backendFetch, readBackendResponse } from "@/lib/backend";
import { readWorkerSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = readWorkerSession((await cookies()).get("liwip_worker_session")?.value);
  if (!session) return NextResponse.json({ message: "Verify your mobile number before submitting" }, { status: 401 });

  try {
    const form = await request.formData();
    form.set("mobile", session.phone);
    const submitPath = process.env.BACKEND_WORKER_SUBMIT_PATH || "/v1/worker-verifications";
    const response = await backendFetch(submitPath, { method: "POST", body: form });
    return NextResponse.json(await readBackendResponse(response), { status: response.status });
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Could not create the verification case";
    const details = error instanceof BackendError ? error.details : undefined;
    return NextResponse.json({ message, details }, { status });
  }
}
