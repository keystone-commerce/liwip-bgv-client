"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type LanguageCode, LANGUAGES, type WorkTypeId } from "@/lib/onboarding/data";
import { mockOnboardingService, type OnboardingService, type ReturningWorker, type WorkerProfile } from "@/lib/onboarding/service";
import { EntryScreen, ReturningScreen } from "./entry-screens";
import { ChooseWorkScreen, ConsentScreen, HomeScreen, PackageScreen } from "./journey-screens";
import { LanguageScreen, MobileScreen, OtpScreen, QuickSignInScreen, VerifiedScreen } from "./sign-in-screens";

export type ScreenId = "entry" | "returning" | "language" | "mobile" | "otp" | "verified" | "quick-sign-in" | "home" | "work" | "package" | "consent";

const SCREENS: ScreenId[] = ["entry", "returning", "language", "mobile", "otp", "verified", "quick-sign-in", "home", "work", "package", "consent"];

interface Draft {
  language: LanguageCode;
  languageChosen: boolean;
  phone: string;
  resendAfter: number;
  worker?: WorkerProfile;
  workType?: WorkTypeId;
  consentDone: boolean;
  quickSignInOffered: boolean;
}

const EMPTY_DRAFT: Draft = { language: "en", languageChosen: false, phone: "", resendAfter: 30, consentDone: false, quickSignInOffered: false };
const DRAFT_KEY = "liwip-onboarding-draft";

const DEMO_WORKER: WorkerProfile = { applicationId: "APP-240916", firstName: "Sandeep", fullName: "Sandeep Meena", phone: "9876543210" };
const DEMO_RETURNING: ReturningWorker = {
  ...DEMO_WORKER,
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

/** Screens that need earlier answers. Restoring without them falls back to entry. */
function isReachable(screen: ScreenId, draft: Draft, returning: ReturningWorker | null) {
  if (screen === "otp") return draft.phone.length === 10;
  if (screen === "returning") return Boolean(returning);
  if (["verified", "quick-sign-in", "home", "work"].includes(screen)) return Boolean(draft.worker);
  if (screen === "package" || screen === "consent") return Boolean(draft.worker && draft.workType);
  return true;
}

function readDraft(): { draft: Draft; screen?: ScreenId } | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft, screen: ScreenId) {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, screen }));
  } catch {
    // Private windows can block storage; the flow still works for this visit.
  }
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function OnboardingFlow({
  service = mockOnboardingService,
  // Entry ships as 1b, the dark variant. ?entry=light shows 2a for comparison.
  entryTone = "dark",
  returningVariant = "r1b"
}: {
  service?: OnboardingService;
  entryTone?: "light" | "dark";
  /** R1 shows card status before unlock, R1b hides it. Product decision pending (DESIGN.md §14). */
  returningVariant?: "r1" | "r1b";
}) {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<ScreenId>("entry");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [returning, setReturning] = useState<ReturningWorker | null>(null);
  const [languageReturn, setLanguageReturn] = useState<ScreenId | null>(null);
  const [tone, setTone] = useState(entryTone);
  const [variant, setVariant] = useState(returningVariant);
  const reduceMotion = useReducedMotion();

  // Restore: dev review params first, then the session draft, then a returning worker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const stored = readDraft();
      const savedReturning = await service.getReturningWorker();
      if (cancelled) return;

      let nextDraft = stored?.draft ?? EMPTY_DRAFT;
      let nextReturning = savedReturning;
      let nextScreen: ScreenId = savedReturning ? "returning" : "entry";

      if (params.get("entry") === "dark" || params.get("entry") === "light") setTone(params.get("entry") as "light" | "dark");
      if (params.get("returning") === "r1" || params.get("returning") === "r1b") setVariant(params.get("returning") as "r1" | "r1b");

      const requested = params.get("step") as ScreenId | null;
      if (process.env.NODE_ENV !== "production" && requested && SCREENS.includes(requested)) {
        // Design review: open any screen directly with demo data behind it.
        nextDraft = { ...nextDraft, phone: nextDraft.phone || DEMO_WORKER.phone, worker: nextDraft.worker ?? DEMO_WORKER };
        if (requested === "package" || requested === "consent") nextDraft.workType = nextDraft.workType ?? "delivery";
        if (requested === "returning") nextReturning = nextReturning ?? DEMO_RETURNING;
        nextScreen = requested;
      } else if (stored?.screen && isReachable(stored.screen, nextDraft, nextReturning)) {
        nextScreen = stored.screen;
      }

      setDraft(nextDraft);
      setReturning(nextReturning);
      setScreen(nextScreen);
      window.history.replaceState({ screen: nextScreen }, "", window.location.pathname + window.location.search);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [service]);

  useEffect(() => {
    if (ready) writeDraft(draft, screen);
  }, [ready, draft, screen]);

  // Hardware and browser back walk the flow instead of leaving the page.
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const target = event.state?.screen as ScreenId | undefined;
      if (target && SCREENS.includes(target)) {
        setDirection(-1);
        setScreen(target);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const go = useCallback((next: ScreenId, options: { replace?: boolean } = {}) => {
    setDirection(1);
    setScreen(next);
    if (options.replace) window.history.replaceState({ screen: next }, "");
    else window.history.pushState({ screen: next }, "");
    window.scrollTo(0, 0);
  }, []);

  const back = useCallback(() => {
    if (window.history.state?.screen && window.history.length > 1) window.history.back();
    else {
      setDirection(-1);
      setScreen("entry");
    }
  }, []);

  const update = useCallback((patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch })), []);

  const openLanguage = useCallback(() => {
    setLanguageReturn(screen);
    go("language");
  }, [go, screen]);

  const languageCode = LANGUAGES.find((item) => item.code === draft.language)?.code ?? "en";
  const chip = languageCode === "en" ? "EN" : languageCode.toUpperCase();

  function render() {
    switch (screen) {
      case "entry":
        return <EntryScreen tone={tone} language={chip} onLanguage={openLanguage} onStart={() => go(draft.languageChosen ? "mobile" : "language")} />;

      case "returning":
        return returning ? (
          <ReturningScreen
            worker={returning}
            variant={variant}
            language={chip}
            onLanguage={openLanguage}
            onUnlock={async () => {
              const result = await service.unlock();
              if (result.ok) {
                update({ worker: returning, phone: returning.phone });
                go("home", { replace: true });
              }
            }}
            onUseOtp={() => {
              update({ phone: returning.phone });
              go("mobile");
            }}
            onNotYou={async () => {
              await service.forgetDevice();
              setReturning(null);
              setDraft(EMPTY_DRAFT);
              go("entry", { replace: true });
            }}
          />
        ) : null;

      case "language":
        return (
          <LanguageScreen
            value={draft.language}
            onBack={languageReturn ? back : undefined}
            onContinue={(code) => {
              update({ language: code, languageChosen: true });
              if (languageReturn) {
                setLanguageReturn(null);
                back();
              } else go("mobile");
            }}
          />
        );

      case "mobile":
        return (
          <MobileScreen
            initial={draft.phone}
            language={chip}
            onBack={back}
            onLanguage={openLanguage}
            onSend={async (phone) => {
              const { resendAfterSeconds } = await service.sendOtp(phone, draft.language);
              update({ phone, resendAfter: resendAfterSeconds });
              go("otp");
            }}
          />
        );

      case "otp":
        return (
          <OtpScreen
            phone={draft.phone}
            language={chip}
            resendAfter={draft.resendAfter}
            onBack={back}
            onLanguage={openLanguage}
            onChangeNumber={back}
            onResend={async () => (await service.sendOtp(draft.phone, draft.language)).resendAfterSeconds}
            onVerify={async (code) => {
              const result = await service.verifyOtp(draft.phone, code);
              if (!result.ok) return result.reason;
              update({ worker: result.worker });
              // A returning worker who chose OTP goes straight home.
              go(returning ? "home" : "verified", { replace: true });
              return "ok";
            }}
          />
        );

      case "verified":
        return draft.worker ? (
          <VerifiedScreen
            applicationId={draft.worker.applicationId}
            onContinue={() => {
              const canOffer = !draft.quickSignInOffered && typeof window !== "undefined" && "PublicKeyCredential" in window;
              go(canOffer ? "quick-sign-in" : "home", { replace: true });
            }}
          />
        ) : null;

      case "quick-sign-in":
        return draft.worker ? (
          <QuickSignInScreen
            onEnable={async () => {
              await service.enableQuickSignIn(draft.worker!);
              setReturning(await service.getReturningWorker());
              update({ quickSignInOffered: true });
              go("home", { replace: true });
            }}
            onSkip={() => {
              update({ quickSignInOffered: true });
              go("home", { replace: true });
            }}
          />
        ) : null;

      case "home":
        return draft.worker ? (
          <HomeScreen
            worker={draft.worker}
            language={chip}
            workType={draft.workType}
            consentDone={draft.consentDone}
            onLanguage={openLanguage}
            onChooseWork={() => go("work")}
            onConsent={() => go("consent")}
          />
        ) : null;

      case "work":
        return (
          <ChooseWorkScreen
            value={draft.workType}
            language={chip}
            onBack={back}
            onLanguage={openLanguage}
            onContinue={(workType) => {
              update({ workType, consentDone: draft.workType === workType ? draft.consentDone : false });
              go("package");
            }}
          />
        );

      case "package":
        return draft.workType ? (
          <PackageScreen workType={draft.workType} language={chip} onBack={back} onLanguage={openLanguage} onOtherPackages={back} onChoose={() => go("consent")} />
        ) : null;

      case "consent":
        return draft.worker ? (
          <ConsentScreen
            language={chip}
            onBack={back}
            onLanguage={openLanguage}
            onAgree={async (records) => {
              await service.recordConsent(draft.worker!.applicationId, records);
              update({ consentDone: true });
              go("home");
            }}
          />
        ) : null;
    }
  }

  if (!ready) return <div className="min-h-dvh bg-background" />;

  // Screen-to-screen only: a short slide in the direction of travel. Reduced motion
  // keeps the crossfade and drops the movement (DESIGN.md §8).
  const offset = reduceMotion ? 0 : 28;
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={screen}
        custom={direction}
        variants={{
          enter: (dir: number) => ({ opacity: 0, x: dir * offset }),
          center: { opacity: 1, x: 0, transition: { duration: reduceMotion ? 0.12 : 0.28, ease: EASE } },
          exit: (dir: number) => ({ opacity: 0, x: dir * -offset * 0.5, transition: { duration: reduceMotion ? 0.08 : 0.16, ease: EASE } })
        }}
        initial="enter"
        animate="center"
        exit="exit"
      >
        {render()}
      </motion.div>
    </AnimatePresence>
  );
}
