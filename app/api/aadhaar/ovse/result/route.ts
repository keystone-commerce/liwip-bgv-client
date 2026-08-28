import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BackendError, backendFetch, readBackendResponse } from "@/lib/backend";
import { readWorkerSession } from "@/lib/session";

type ResultResponse = {
  client_id?: string;
  status?: string;
  full_name?: string;
  dob?: string;
  gender?: string;
  pincode?: string;
  masked_mobile?: string;
  masked_email?: string;
  has_image?: boolean;
  age_above_18?: boolean;
};

export async function GET(request: Request) {
  const session = readWorkerSession((await cookies()).get("liwip_worker_session")?.value);
  if (!session) return NextResponse.json({ message: "Verify your mobile number before retrieving Aadhaar results" }, { status: 401 });

  const clientId = new URL(request.url).searchParams.get("client_id")?.trim();
  if (!clientId) return NextResponse.json({ message: "client_id is required" }, { status: 400 });

  try {
    const response = await backendFetch(`/v1/aadhaar/ovse/result?client_id=${encodeURIComponent(clientId)}`);
    const result = await readBackendResponse(response) as ResultResponse;
    return NextResponse.json({
      clientId: result.client_id,
      status: result.status,
      fullName: result.full_name,
      dob: result.dob,
      gender: result.gender,
      pinCode: result.pincode,
      maskedMobile: result.masked_mobile,
      maskedEmail: result.masked_email,
      hasImage: result.has_image,
      ageAbove18: result.age_above_18
    });
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Could not retrieve Aadhaar verification result";
    const details = error instanceof BackendError ? error.details : undefined;
    return NextResponse.json({ message, details }, { status });
  }
}
