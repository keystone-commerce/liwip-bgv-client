// Static content for the mobile onboarding flow (DESIGN.md §13).
// Package check lists and timings are placeholders until product confirms them
// (DESIGN.md §14, open decisions). Prices and counts follow FALLBACK_PACKAGES.

import type { VerificationState } from "@/components/state-badge";

export type LanguageCode = "en" | "hi" | "mr" | "bn" | "ta" | "te";

export const LANGUAGES: { code: LanguageCode; native: string; english: string }[] = [
  { code: "en", native: "English", english: "EN" },
  { code: "hi", native: "हिन्दी", english: "Hindi" },
  { code: "mr", native: "मराठी", english: "Marathi" },
  { code: "bn", native: "বাংলা", english: "Bengali" },
  { code: "ta", native: "தமிழ்", english: "Tamil" },
  { code: "te", native: "తెలుగు", english: "Telugu" }
];

export type WorkTypeId = "delivery" | "driver" | "home" | "security" | "warehouse" | "temporary";

export interface WorkType {
  id: WorkTypeId;
  title: string;
  detail: string;
  /** Short noun used in button labels: CONTINUE AS RIDER, CHOOSE RIDER · ₹449. */
  short: string;
  /** Sentence fragment for the package lead: "what delivery platforms ask for". */
  platforms: string;
  packageCode: string;
}

export const WORK_TYPES: WorkType[] = [
  { id: "delivery", title: "Delivery rider", detail: "Food, grocery, parcels", short: "rider", platforms: "delivery platforms", packageCode: "RIDER" },
  { id: "driver", title: "Cab or auto driver", detail: "Passenger and commercial", short: "driver", platforms: "ride platforms", packageCode: "DRIVER" },
  { id: "home", title: "Home services", detail: "Cleaning, repair, care", short: "home services", platforms: "home service platforms", packageCode: "HOME_SERVICES" },
  { id: "security", title: "Security staff", detail: "Guarding, access control", short: "security", platforms: "security agencies", packageCode: "SECURITY" },
  { id: "warehouse", title: "Factory or warehouse", detail: "Operations, material handling", short: "warehouse", platforms: "warehouse employers", packageCode: "FACTORY_WAREHOUSE" },
  { id: "temporary", title: "Short-term work", detail: "Events, temporary roles", short: "short-term", platforms: "short-term employers", packageCode: "BASIC_ID" }
];

export type CheckId =
  | "mobile" | "identity" | "face" | "licence" | "vehicle" | "address" | "court" | "police" | "employment" | "reference";

export const CHECK_NAMES: Record<CheckId, string> = {
  mobile: "Mobile number",
  identity: "Identity · PAN or Aadhaar",
  face: "Face match",
  licence: "Driving licence",
  vehicle: "Vehicle registration",
  address: "Address",
  court: "Court record",
  police: "Police verification",
  employment: "Previous employment",
  reference: "Personal reference"
};

export const CHECK_TIMING: Record<CheckId, string> = {
  mobile: "Instant",
  identity: "Instant",
  face: "Instant",
  licence: "Instant",
  vehicle: "Instant",
  address: "1–2 days",
  court: "2–3 days",
  police: "5–7 days",
  employment: "2–4 days",
  reference: "1–2 days"
};

export interface OnboardingPackage {
  code: string;
  name: string;
  priceInr: number;
  validityMonths: number;
  checks: CheckId[];
}

export const PACKAGES: Record<string, OnboardingPackage> = {
  RIDER: { code: "RIDER", name: "Rider", priceInr: 449, validityMonths: 12, checks: ["mobile", "identity", "face", "licence", "vehicle", "address", "court", "police"] },
  DRIVER: { code: "DRIVER", name: "Driver", priceInr: 549, validityMonths: 12, checks: ["mobile", "identity", "face", "licence", "vehicle", "address", "court", "police", "reference"] },
  HOME_SERVICES: { code: "HOME_SERVICES", name: "Home services", priceInr: 499, validityMonths: 12, checks: ["mobile", "identity", "face", "address", "court", "police", "reference"] },
  SECURITY: { code: "SECURITY", name: "Security", priceInr: 599, validityMonths: 12, checks: ["mobile", "identity", "face", "address", "court", "police", "employment", "reference"] },
  FACTORY_WAREHOUSE: { code: "FACTORY_WAREHOUSE", name: "Warehouse", priceInr: 399, validityMonths: 12, checks: ["mobile", "identity", "face", "address", "court", "employment"] },
  BASIC_ID: { code: "BASIC_ID", name: "Basic ID", priceInr: 199, validityMonths: 12, checks: ["mobile", "identity", "face"] }
};

export interface ConsentItem {
  id: string;
  title: string;
  detail: string;
}

/** Text version recorded with every approval (DESIGN.md §6). */
export const CONSENT_TEXT_VERSION = "2026-09-v1";

export const CONSENTS: ConsentItem[] = [
  { id: "case", title: "Use my details for this case", detail: "Needed to open and run the case." },
  { id: "identity", title: "Check my identity documents", detail: "PAN, Aadhaar, licence or voter ID." },
  { id: "address", title: "Confirm my address", detail: "Matched against official records." },
  { id: "face", title: "Match my selfie to my ID", detail: "Photo used only for this match." },
  { id: "court", title: "Search court records", detail: "By name and address, on eCourts." }
];

/** The five onboarding stages shown in the top progress strip. */
export const STAGES = ["Sign in", "Your work", "Your details", "Confirm & pay", "Result"] as const;

export interface CardCheck {
  id: CheckId;
  state: VerificationState;
}

export function formatPhone(digits: string) {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

export function maskPhone(digits: string) {
  return `+91 ••••• •${digits.slice(-4)}`;
}

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}
