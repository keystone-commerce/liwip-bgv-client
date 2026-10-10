// The worker's digital Liwip BGV Card, as the API returns it, plus the words we show for it.
// Browser code calls only /api/worker/card/* (AGENTS.md: the browser never talks to the backend).

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { VerificationState } from "@/components/state-badge";

/* Types ------------------------------------------------------------------- */

export type CardCheckStatus = "PENDING" | "QUEUED" | "PROCESSING" | "VERIFIED" | "FAILED" | "MANUAL_REVIEW";

export type CardCheck = { type: string; status: CardCheckStatus; completedAt: string | null; source: string | null };

export type LiveCode = { token: string; expiresAt: number };

export type CardStatus = "valid" | "expiring" | "updating" | "expired" | "suspended";

type CardBase = { name: string | null; hasPhoto: boolean; checks: CardCheck[]; verifiedCount: number; totalCount: number };

export type NotIssuedCardView = CardBase & { issued: false };

export type IssuedCardView = CardBase & {
  issued: true;
  cardNumber: string;
  issuedAt: string;
  expiresAt: string;
  status: CardStatus;
  fixedToken: string | null;
  live: LiveCode | null;
  scansLastWeek: number;
};

export type CardView = NotIssuedCardView | IssuedCardView;

/* Words ------------------------------------------------------------------- */

/** API status to one of the five design states (DESIGN.md §2). Never show the raw status. */
export function stateForStatus(status: CardCheckStatus): VerificationState {
  switch (status) {
    case "VERIFIED":
      return "verified";
    case "MANUAL_REVIEW":
      return "review";
    case "FAILED":
      return "fix";
    case "PROCESSING":
      return "checking";
    default:
      return "queued";
  }
}

/** Worst first, so a combined row shows the state that needs attention. */
const STATE_RANK: Record<VerificationState, number> = { fix: 0, review: 1, checking: 2, queued: 3, verified: 4 };

const CHECK_NAMES: Record<string, { name: string; source: string }> = {
  AADHAAR: { name: "Aadhaar", source: "Aadhaar" },
  PAN: { name: "PAN card", source: "Income Tax" },
  FACE: { name: "Selfie match", source: "Live selfie" },
  DRIVING_LICENSE: { name: "Driving licence", source: "Parivahan" },
  RC_V2: { name: "Vehicle RC", source: "Parivahan" },
  VOTER_ID: { name: "Voter ID", source: "Election Commission" },
  PASSPORT: { name: "Passport", source: "Passport Seva" },
  EMPLOYMENT_HISTORY: { name: "Employment history", source: "EPFO" },
  ECOURTS_SEARCH: { name: "Court records", source: "eCourts" }
};

const AADHAAR_SOURCES: Record<string, string> = { DIGILOCKER: "DigiLocker", AADHAAR_OVSE: "Aadhaar app" };

/** Priority order on the card (CARD-DESIGN-SPEC §3.5). */
const ORDER = ["AADHAAR", "PAN", "FACE", "DRIVING_LICENSE", "VOTER_ID", "RC_V2", "ECOURTS_SEARCH", "EMPLOYMENT_HISTORY", "PASSPORT"];

export type CardRow = {
  key: string;
  name: string;
  source: string;
  state: VerificationState;
  /** ISO date the check passed; null until it has. */
  completedAt: string | null;
};

/** One row per check the worker sees. FACE_LIVENESS and FACE_MATCH are one "Selfie match" row. */
export function cardRows(checks: CardCheck[]): CardRow[] {
  const groups = new Map<string, CardCheck[]>();
  for (const check of checks) {
    const key = check.type === "FACE_LIVENESS" || check.type === "FACE_MATCH" ? "FACE" : check.type;
    groups.set(key, [...(groups.get(key) ?? []), check]);
  }
  const rows: CardRow[] = [];
  for (const [key, group] of groups) {
    const states = group.map((check) => stateForStatus(check.status));
    const state = states.reduce((worst, next) => (STATE_RANK[next] < STATE_RANK[worst] ? next : worst));
    const known = CHECK_NAMES[key];
    const aadhaarSource = key === "AADHAAR" ? group.map((check) => check.source && AADHAAR_SOURCES[check.source]).find(Boolean) : undefined;
    const dates = group.map((check) => check.completedAt).filter((date): date is string => Boolean(date)).sort();
    rows.push({
      key,
      name: known?.name ?? titleCase(key),
      source: aadhaarSource || known?.source || "Liwip",
      state,
      completedAt: state === "verified" ? (dates.at(-1) ?? null) : null
    });
  }
  const rank = (key: string) => (ORDER.includes(key) ? ORDER.indexOf(key) : ORDER.length);
  return rows.sort((a, b) => rank(a.key) - rank(b.key));
}

function titleCase(value: string) {
  const words = value.toLowerCase().split("_");
  return words.map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join(" ");
}

/** `11 Oct 2027` (CARD-DESIGN-SPEC §3.7). Never `11/10/27`. */
export function formatCardDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Whole days from `now` until `iso`, rounded up; 0 once it has passed. */
export function daysUntil(iso: string, now: number) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));
}

/** `1:42`, for the QR countdown. */
export function formatCountdown(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** What the QR encodes: a link, never personal data (CARD-DESIGN-SPEC §3.6). */
export function qrPayload(token: string, origin: string) {
  return `${origin}/v/${token}`;
}

const noSubscribe = () => () => {};

/** location.origin, hydration-safe: empty on the server and during hydration. */
export function useOrigin() {
  return useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => ""
  );
}

/** Cache-busted photo URL; the route answers 404 when there is no photo. */
export function cardPhotoUrl(version: string | number) {
  return `/api/worker/card/photo?v=${encodeURIComponent(String(version))}`;
}

/* API client ---------------------------------------------------------------- */

export class CardError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "CardError";
  }
  get signedOut() {
    return this.status === 401;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { cache: "no-store", ...init });
  } catch {
    throw new CardError("You are offline. Check your connection and try again.", 0);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new CardError(body?.message || "Something went wrong. Try again.", response.status);
  }
  return (await response.json()) as T;
}

export function fetchCard() {
  return request<CardView>("/api/worker/card");
}

export function fetchLiveCode() {
  return request<LiveCode>("/api/worker/card/live-code");
}

export function reissueCard() {
  return request<{ reissued: true }>("/api/worker/card/reissue", { method: "POST" });
}

/* Hooks ------------------------------------------------------------------- */

/** The live QR changes every 2 minutes. */
export const LIVE_CODE_PERIOD_MS = 120_000;
/** Ask for the next code a little before this one runs out. */
const REFRESH_LEAD_MS = 4_000;
const RETRY_MS = 5_000;

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** navigator.onLine as React state; assumes online on the server. */
export function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
}

/** The current time, ticking every `intervalMs`. */
export function useNow(intervalMs = 1_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export type LiveCodeState = {
  /** Null while there is no unexpired code: an old code would not scan, so it is never shown. */
  token: string | null;
  secondsLeft: number;
  /** 1 when the code is new, 0 when it runs out. Drives the progress line. */
  fraction: number;
  offline: boolean;
  signedOut: boolean;
  /** Fetch a new code now, for TRY AGAIN. */
  refresh: () => void;
};

/**
 * Keeps the live QR token fresh. Fetches the next code from /api/worker/card/live-code just
 * before the current one expires, retries every few seconds on failure, and reports `offline`
 * when the browser is offline or the code could not be refreshed in time.
 * Pass `enabled: false` for a card whose QR is off (expired, suspended).
 */
export function useLiveCode(initial: LiveCode | null, { enabled = true }: { enabled?: boolean } = {}): LiveCodeState {
  const [code, setCode] = useState<LiveCode | null>(initial);
  const [failed, setFailed] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const online = useOnline();
  const now = useNow(1_000);

  useEffect(() => {
    if (!enabled || !online || signedOut) return;
    let cancelled = false;
    let retryTimer: number | undefined;
    const delay = code ? Math.max(0, code.expiresAt - Date.now() - REFRESH_LEAD_MS) : 0;
    const timer = window.setTimeout(async () => {
      try {
        const next = await fetchLiveCode();
        if (cancelled) return;
        setCode(next);
        setFailed(false);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof CardError && error.signedOut) {
          setSignedOut(true);
          return;
        }
        setFailed(true);
        retryTimer = window.setTimeout(() => setAttempt((value) => value + 1), RETRY_MS);
      }
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [enabled, online, signedOut, code, attempt]);

  const refresh = useCallback(() => {
    setFailed(false);
    setCode(null);
    setAttempt((value) => value + 1);
  }, []);

  const msLeft = code ? code.expiresAt - now : 0;
  const fresh = Boolean(code) && msLeft > 0;
  return {
    token: enabled && online && fresh && code ? code.token : null,
    secondsLeft: fresh ? Math.ceil(msLeft / 1000) : 0,
    fraction: fresh ? Math.min(1, msLeft / LIVE_CODE_PERIOD_MS) : 0,
    offline: enabled && (!online || (failed && !fresh)),
    signedOut,
    refresh
  };
}
