// The onboarding screens talk only to this interface. The mock below stands in
// until the backend is ready; swap it for an implementation that calls
// app/api/* routes without touching the screens.

import type { CardCheck, LanguageCode } from "./data";
import { workerCaseApi } from "./worker-case";

export interface WorkerProfile {
  /** The verification case. Used with the backend and support, not shown on the card. */
  applicationId: string;
  /**
   * Liwip BGV Card number. Issued when the mobile number is verified and kept for the
   * life of the card, so the digital and physical card carry the same number.
   * Format is a placeholder until product confirms it (DESIGN.md §14).
   */
  cardNumber: string;
  firstName: string;
  fullName: string;
  phone: string;
}

export type VerifyOtpResult = { ok: true; worker: WorkerProfile } | { ok: false; reason: "wrong-code" | "expired" };

export interface ConsentRecord {
  id: string;
  textVersion: string;
  approvedAt: string;
}

export interface ReturningWorker extends WorkerProfile {
  checks: CardCheck[];
  /** One line describing the check that is live right now, if any. */
  liveSummary?: string;
}

export interface OnboardingService {
  sendOtp(phone: string, language: LanguageCode): Promise<{ resendAfterSeconds: number }>;
  verifyOtp(phone: string, code: string): Promise<VerifyOtpResult>;
  enableQuickSignIn(worker: WorkerProfile): Promise<{ ok: boolean }>;
  recordConsent(applicationId: string, records: ConsentRecord[]): Promise<void>;
  getReturningWorker(): Promise<ReturningWorker | null>;
  unlock(): Promise<{ ok: boolean }>;
  forgetDevice(): Promise<void>;
}

// Versioned with the stored shape (v2: cardNumber); older entries are ignored.
const RETURNING_KEY = "liwip-onboarding-returning-v2";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked in private windows; the flow still works without it.
  }
}

/** Placeholder backend. Any 6-digit code passes except 000000, which shows the wrong-code state. */
export const mockOnboardingService: OnboardingService = {
  async sendOtp() {
    await wait(500);
    return { resendAfterSeconds: 30 };
  },

  async verifyOtp(phone, code) {
    await wait(600);
    if (code === "000000") return { ok: false, reason: "wrong-code" };
    return { ok: true, worker: { applicationId: "APP-240916", cardNumber: "LBC 2409 1673", firstName: "Sandeep", fullName: "Sandeep Meena", phone } };
  },

  async enableQuickSignIn(worker) {
    await wait(700);
    const returning: ReturningWorker = {
      ...worker,
      checks: [
        { id: "mobile", state: "verified" },
        { id: "identity", state: "verified" },
        { id: "face", state: "verified" },
        { id: "licence", state: "verified" },
        { id: "vehicle", state: "verified" },
        { id: "court", state: "checking" },
        { id: "address", state: "queued" },
        { id: "police", state: "queued" }
      ],
      liveSummary: "Court record is being checked."
    };
    writeStorage(RETURNING_KEY, returning);
    return { ok: true };
  },

  async recordConsent() {
    await wait(400);
  },

  async getReturningWorker() {
    return readStorage<ReturningWorker>(RETURNING_KEY);
  },

  async unlock() {
    await wait(700);
    return { ok: true };
  },

  async forgetDevice() {
    writeStorage(RETURNING_KEY, null);
  }
};

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

/** Real backend: OTP through app/api/auth/*, the case through app/api/worker/case. */
export const apiOnboardingService: OnboardingService = {
  async sendOtp(phone) {
    const result = await postJson("/api/auth/send-otp", { phone });
    if (!result.ok) throw new Error(result.data?.message || "Could not send the code");
    return { resendAfterSeconds: Number(result.data?.resendAfterSeconds) || 30 };
  },

  async verifyOtp(phone, code) {
    const result = await postJson("/api/auth/verify-otp", { phone, otp: code });
    if (result.status === 401 || result.status === 400) return { ok: false, reason: "wrong-code" };
    if (!result.ok) throw new Error(result.data?.message || "Could not verify the code");
    const workerCase = await workerCaseApi.get();
    const fullName = workerCase.details.fullName ?? "";
    return {
      ok: true,
      worker: { applicationId: workerCase.applicationId, cardNumber: workerCase.cardNumber ?? "", firstName: fullName.split(" ")[0] ?? "", fullName, phone }
    };
  },

  async enableQuickSignIn(worker) {
    // Passkeys are not wired to the backend yet; remember the worker on this device only.
    writeStorage(RETURNING_KEY, { ...worker, checks: [] } satisfies ReturningWorker);
    return { ok: true };
  },

  async recordConsent() {
    // Consent is recorded per chosen check through workerCaseApi.consent.
  },

  async getReturningWorker() {
    return readStorage<ReturningWorker>(RETURNING_KEY);
  },

  async unlock() {
    return { ok: true };
  },

  async forgetDevice() {
    writeStorage(RETURNING_KEY, null);
  }
};
