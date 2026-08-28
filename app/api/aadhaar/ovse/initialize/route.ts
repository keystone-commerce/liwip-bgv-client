import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BackendError, backendFetch, readBackendResponse } from "@/lib/backend";
import { readWorkerSession } from "@/lib/session";

type InitializeResponse = {
  client_id?: string;
  channel?: string;
  status?: string;
  web_link?: string | null;
  reference_id?: string;
};

export async function POST(request: Request) {
  const session = readWorkerSession((await cookies()).get("liwip_worker_session")?.value);
  if (!session) return NextResponse.json({ message: "Verify your mobile number before starting Aadhaar verification" }, { status: 401 });

  try {
    const input = await request.json().catch(() => ({})) as { fullName?: string };
    const redirectUrl = process.env.AADHAAR_OVSE_REDIRECT_URL || new URL("/?aadhaar=return", request.url).toString();
    const response = await backendFetch("/v1/aadhaar/ovse/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "web",
        claims: ["full_name", "dob", "gender", "mobile", "profile_image", "address", "pincode", "age_above_18"],
        auth_mode: "1",
        language: "23",
        ...(input.fullName?.trim() ? { hint: input.fullName.trim().slice(0, 100) } : {}),
        redirect_url: redirectUrl
      })
    });
    const result = await readBackendResponse(response) as InitializeResponse;
    if (!result.web_link) throw new Error("Aadhaar OVSE did not return a Pehchaan web link");

    return NextResponse.json({
      clientId: result.client_id,
      channel: result.channel,
      status: result.status,
      webLink: result.web_link,
      referenceId: result.reference_id
    });
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Could not start Aadhaar verification";
    const details = error instanceof BackendError ? error.details : undefined;
    return NextResponse.json({ message, details }, { status });
  }
}
