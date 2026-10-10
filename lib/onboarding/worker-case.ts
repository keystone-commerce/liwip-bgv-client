// The worker's own case, as the API returns it, plus the words we show for it.
// Browser code calls only /api/worker/case/* (DESIGN.md: the browser never talks to the backend).

import type { VerificationState } from "@/components/state-badge";

export type SelectableCheck =
  | "AADHAAR"
  | "PAN"
  | "FACE"
  | "DRIVING_LICENSE"
  | "VOTER_ID"
  | "RC_V2"
  | "ECOURTS_SEARCH"
  | "EMPLOYMENT_HISTORY"
  | "PASSPORT";

export type ApiCheckStatus = "PENDING" | "QUEUED" | "PROCESSING" | "VERIFIED" | "FAILED" | "MANUAL_REVIEW";

export interface WorkerCase {
  applicationId: string;
  cardNumber: string | null;
  status: "DRAFT" | "PENDING_VERIFICATION" | "VERIFICATION_IN_PROGRESS" | "VERIFIED" | "VERIFICATION_FAILED" | "MANUAL_REVIEW";
  /** Every check the platform offers, most important first. */
  catalog: Array<{ check: SelectableCheck; available: boolean; requires: SelectableCheck | null; consent: string; selected: boolean }>;
  selectedChecks: SelectableCheck[];
  consent: { textVersion: string; grantedAt: string; items: string[] } | null;
  details: { source: "AADHAAR" | "WORKER" | null; fullName: string | null; declaredName: string | null; dateOfBirth: string | null; fatherName: string | null; address: string | null };
  identity: { source: string; status: "PENDING" | "VERIFIED" | "FAILED" } | null;
  checks: Array<{ id: string; type: string; status: ApiCheckStatus; needsInput: boolean; canResubmit: boolean; reason: string | null; updatedAt: string }>;
  card: { status: string; issuedAt: string; expiresAt: string } | null;
}

export const CHECK_INFO: Record<SelectableCheck, { title: string; detail: string; types: string[] }> = {
  AADHAAR: { title: "Aadhaar", detail: "Aadhaar OTP. Gives your name, date of birth and photo.", types: ["AADHAAR"] },
  PAN: { title: "PAN card", detail: "Your 10-character PAN.", types: ["PAN"] },
  FACE: { title: "Selfie match", detail: "A selfie matched to your Aadhaar photo.", types: ["FACE_LIVENESS", "FACE_MATCH"] },
  DRIVING_LICENSE: { title: "Driving licence", detail: "Licence number. Checks it is valid.", types: ["DRIVING_LICENSE"] },
  VOTER_ID: { title: "Voter ID", detail: "Your EPIC number.", types: ["VOTER_ID"] },
  RC_V2: { title: "Vehicle RC", detail: "Your vehicle number.", types: ["RC_V2"] },
  ECOURTS_SEARCH: { title: "Court records", detail: "Search by name, father's name and address.", types: ["ECOURTS_SEARCH"] },
  EMPLOYMENT_HISTORY: { title: "Employment history", detail: "Your 12-digit UAN from EPFO.", types: ["EMPLOYMENT_HISTORY"] },
  PASSPORT: { title: "Passport", detail: "Passport file number.", types: ["PASSPORT"] }
};

export const CASE_CONSENT_VERSION = "2026-10-v1";

/** One consent row per purpose. Only the rows the chosen checks need are shown. */
export const CONSENT_ITEMS: Record<string, { title: string; detail: string }> = {
  case: { title: "Use my details for this case", detail: "Needed to open and run the case." },
  identity: { title: "Check my identity documents", detail: "Only the documents you chose." },
  face: { title: "Match my selfie to my Aadhaar photo", detail: "Photo used only for this match." },
  vehicle: { title: "Check my vehicle registration", detail: "RC details from the transport department." },
  employment: { title: "Check my employment history", detail: "EPFO records for your UAN." },
  court: { title: "Search court records", detail: "By name, father's name and address, on eCourts." }
};

export function consentItemsFor(workerCase: WorkerCase, chosen: SelectableCheck[]): string[] {
  const purposes = chosen.map((check) => workerCase.catalog.find((item) => item.check === check)?.consent).filter((item): item is string => Boolean(item));
  return ["case", ...new Set(purposes)].filter((item, index, all) => all.indexOf(item) === index);
}

/** API status → design state (DESIGN.md §2). Never shown raw. */
export function stateFor(status: ApiCheckStatus): VerificationState {
  if (status === "VERIFIED") return "verified";
  if (status === "MANUAL_REVIEW") return "review";
  if (status === "FAILED") return "fix";
  if (status === "PROCESSING") return "checking";
  return "queued";
}

const ORDER: VerificationState[] = ["fix", "review", "checking", "queued", "verified"];

/** One row per chosen check. FACE is two API checks; it shows the less finished of the two. */
export function chosenChecks(workerCase: WorkerCase) {
  return workerCase.selectedChecks.map((check) => {
    const rows = workerCase.checks.filter((row) => CHECK_INFO[check].types.includes(row.type));
    const state = rows.length ? rows.map((row) => stateFor(row.status)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0] : "queued";
    return {
      check,
      state,
      needsInput: rows.some((row) => row.needsInput),
      canResubmit: rows.some((row) => row.canResubmit),
      reason: rows.find((row) => row.reason)?.reason ?? null,
      running: rows.some((row) => row.status === "QUEUED" || row.status === "PROCESSING")
    };
  });
}

/**
 * Opens the official Aadhaar (Pehchaan) app with the signed request, the same way
 * Surepass's hosted launcher does. Null where the app cannot run (desktop).
 */
export function aadhaarAppUrl(intentData: string): string | null {
  const agent = navigator.userAgent;
  if (/Android/i.test(agent)) return `intent:#Intent;action=in.gov.uidai.pehchaan.WEB_INTENT_REQUEST;S.request=${intentData};end`;
  const iOS = /iPhone|iPad|iPod/i.test(agent) || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1);
  return iOS ? `pehchaan://in.gov.uidai.pehchaan?req=${encodeURIComponent(intentData)}` : null;
}

export class CaseError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/worker/case${path}`, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new CaseError(response.status, (body && typeof body.message === "string" && body.message) || "Something went wrong. Try again.");
  return body as T;
}

const json = (method: "PUT" | "POST", body?: unknown): RequestInit => ({
  method,
  headers: body === undefined ? undefined : { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body)
});

export const workerCaseApi = {
  get: () => request<WorkerCase>(""),
  saveName: (fullName: string) => request<WorkerCase>("/name", json("PUT", { fullName })),
  selectChecks: (checks: SelectableCheck[]) => request<WorkerCase>("/checks", json("PUT", { checks })),
  consent: (items: string[]) => request<WorkerCase>("/consent", json("POST", { textVersion: CASE_CONSENT_VERSION, items })),
  saveDetails: (details: { fullName?: string; dateOfBirth?: string; fatherName?: string; address?: string }) => request<WorkerCase>("/details", json("PUT", details)),
  startAadhaar: () => request<{ url: string; intentData: string | null }>("/identity/aadhaar/start", json("POST")),
  startDigiLocker: () => request<{ url: string }>("/identity/digilocker/start", json("POST")),
  completeAadhaar: () => request<WorkerCase>("/identity/aadhaar/complete", json("POST")),
  submitCheck: (check: Exclude<SelectableCheck, "AADHAAR" | "FACE">, input: Record<string, string>) =>
    request<WorkerCase>(`/checks/${check.toLowerCase()}`, json("POST", input)),
  submitSelfie: (file: File) => {
    const form = new FormData();
    form.set("selfie", file);
    return request<WorkerCase>("/checks/face", { method: "POST", body: form });
  }
};
