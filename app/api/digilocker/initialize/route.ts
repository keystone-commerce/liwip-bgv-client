import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BackendError, backendFetch, readBackendResponse } from "@/lib/backend";
import { readWorkerSession } from "@/lib/session";

type InitializeResponse = {
  client_id?: string;
  url?: string;
  expiry_seconds?: number;
  state?: string;
};

export async function POST(request: Request) {
  const session = readWorkerSession((await cookies()).get("liwip_worker_session")?.value);
  if (!session) return NextResponse.json({ message: "Verify your mobile number before opening DigiLocker" }, { status: 401 });

  try {
    const input = await request.json().catch(() => ({})) as { fullName?: string; email?: string };
    const redirectUrl = process.env.DIGILOCKER_REDIRECT_URL || new URL("/?digilocker=return", request.url).toString();
    const logoUrl = process.env.DIGILOCKER_LOGO_URL;
    const localFrontendUrl = new URL("/", request.url).toString();
    const data = {
      signup_flow: true,
      auth_type: "web",
      verify_phone: false,
      verify_email: false,
      allow_selection: true,
      aadhaar_xml: true,
      expiry_minutes: 10,
      retry_count: 2,
      skip_main_screen: false,
      redirect_url: redirectUrl,
      ...(request.url.startsWith("http://localhost") ? { local_frontend_url: localFrontendUrl } : {}),
      ...(logoUrl ? { logo_url: logoUrl } : {}),
      prefill_options: {
        mobile_number: session.phone,
        ...(input.fullName?.trim() ? { full_name: input.fullName.trim() } : {}),
        ...(input.email?.trim() ? { user_email: input.email.trim() } : {})
      }
    };

    const response = await backendFetch("/v1/digilocker/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data })
    });
    const result = await readBackendResponse(response) as InitializeResponse;
    if (!result.url) throw new Error("DigiLocker did not return a redirect URL");

    return NextResponse.json({
      clientId: result.client_id,
      url: result.url,
      expirySeconds: result.expiry_seconds,
      state: result.state
    });
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Could not start DigiLocker";
    const details = error instanceof BackendError ? error.details : undefined;
    return NextResponse.json({ message, details }, { status });
  }
}
