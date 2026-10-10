"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type LanguageCode, LANGUAGES } from "@/lib/onboarding/data";
import { apiOnboardingService, canUseQuickSignIn, type OnboardingService, type ReturningWorker, type WorkerProfile } from "@/lib/onboarding/service";
import { CardError, fetchCard, reissueCard, type CardView } from "@/lib/onboarding/card";
import { CaseError, aadhaarAppUrl, workerCaseApi, type SelectableCheck, type WorkerCase } from "@/lib/onboarding/worker-case";
import { HELP_URL } from "@/lib/onboarding/data";
import { CardReveal } from "./card-reveal";
import { CardChecksScreen, CardHomeScreen, CardScreen, CardSoFarScreen, LargeQrScreen, ReissueScreen } from "./card-screens";
import { CaseConsentScreen, CaseHomeScreen, CheckFormScreen, ChooseChecksScreen, DetailsScreen, NameScreen, NextStepFooter, SelfieScreen, useNextAction, type CaseActions, type FormCheck } from "./case-screens";
import { HeaderChip, LanguageChip } from "./shell";
import { EntryScreen, ReturningScreen } from "./entry-screens";
import { LanguageScreen, MobileScreen, OtpScreen, QuickSignInScreen, VerifiedScreen } from "./sign-in-screens";

export type ScreenId =
  | "entry" | "returning" | "language" | "mobile" | "otp" | "name" | "verified" | "quick-sign-in" | "home" | "checks" | "case-consent" | "details" | "check-form" | "selfie"
  | "card-so-far" | "card" | "card-qr" | "card-checks" | "card-reissue" | "add-checks" | "add-consent";

const SCREENS: ScreenId[] = [
  "entry", "returning", "language", "mobile", "otp", "name", "verified", "quick-sign-in", "home", "checks", "case-consent", "details", "check-form", "selfie",
  "card-so-far", "card", "card-qr", "card-checks", "card-reissue", "add-checks", "add-consent"
];
const CARD_SCREENS: ScreenId[] = ["card-so-far", "card", "card-qr", "card-checks", "card-reissue"];

interface Draft {
  language: LanguageCode;
  languageChosen: boolean;
  phone: string;
  resendAfter: number;
  worker?: WorkerProfile;
  /** The document form open on the check-form screen. */
  formCheck?: FormCheck;
  /** Checks being added to the card, between choosing and approving them. */
  adding?: SelectableCheck[];
  quickSignInOffered: boolean;
}

const EMPTY_DRAFT: Draft = { language: "en", languageChosen: false, phone: "", resendAfter: 30, quickSignInOffered: false };
// Bump the version whenever the shape of Draft or WorkerProfile changes, so a browser
// holding an older draft starts fresh instead of rendering missing fields (v3: real case, chosen checks).
const DRAFT_KEY = "liwip-onboarding-draft-v3";

const DEMO_WORKER: WorkerProfile = { applicationId: "APP-240916", cardNumber: "LBC 2409 1673", firstName: "Sandeep", fullName: "Sandeep Meena", phone: "9876543210" };
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
  if (screen === "check-form") return Boolean(draft.worker && draft.formCheck);
  if (screen === "add-consent") return Boolean(draft.worker && draft.adding?.length);
  if (["name", "verified", "quick-sign-in", "home", "checks", "case-consent", "details", "selfie", "add-checks", ...CARD_SCREENS].includes(screen)) return Boolean(draft.worker);
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

// The reveal plays once per card on this device.
const revealKey = (cardNumber: string) => `liwip-card-revealed:${cardNumber}`;
function wasRevealed(cardNumber: string) {
  try {
    return window.localStorage.getItem(revealKey(cardNumber)) === "1";
  } catch {
    return true; // storage blocked: skip the moment rather than replay it on every visit
  }
}
function markRevealed(cardNumber: string) {
  try {
    window.localStorage.setItem(revealKey(cardNumber), "1");
  } catch {
    // Private windows can block storage.
  }
}

export function OnboardingFlow({
  service = apiOnboardingService,
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
  const [workerCase, setWorkerCase] = useState<WorkerCase | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [card, setCard] = useState<CardView | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  // Set once when the page loads on the return from the Aadhaar page.
  const aadhaarReturn = useRef(false);
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
        if (requested === "returning") nextReturning = nextReturning ?? DEMO_RETURNING;
        nextScreen = requested;
      } else if ((params.get("identity") === "aadhaar" || params.get("identity") === "digilocker") && nextDraft.worker) {
        // Back from the Aadhaar page: home finishes the check.
        aadhaarReturn.current = true;
        nextScreen = "home";
      } else if (stored?.screen && isReachable(stored.screen, nextDraft, nextReturning)) {
        nextScreen = stored.screen;
      }

      setDraft(nextDraft);
      setReturning(nextReturning);
      setScreen(nextScreen);
      params.delete("identity");
      const query = params.toString();
      window.history.replaceState({ screen: nextScreen }, "", window.location.pathname + (query ? `?${query}` : ""));
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

  const signedOut = useCallback(() => {
    setDraft((current) => ({ ...current, worker: undefined }));
    setWorkerCase(null);
    setCard(null);
    setScreen("mobile");
  }, []);

  /** Loads the case. A missing or expired worker session sends the worker to sign in again. */
  const loadCase = useCallback(async () => {
    try {
      if (aadhaarReturn.current) {
        aadhaarReturn.current = false;
        setWorkerCase(await workerCaseApi.completeAadhaar());
      } else {
        setWorkerCase(await workerCaseApi.get());
      }
      setNotice(null);
    } catch (failure) {
      if (failure instanceof CaseError && failure.status === 401) return signedOut();
      setNotice(failure instanceof Error ? failure.message : "Your case could not be loaded. Try again.");
    }
  }, [signedOut]);

  const loadCard = useCallback(async () => {
    try {
      setCard(await fetchCard());
    } catch (failure) {
      if (failure instanceof CardError && failure.signedOut) return signedOut();
      setNotice(failure instanceof Error ? failure.message : "Your card could not be loaded. Try again.");
    }
  }, [signedOut]);

  // The card follows the case: reload it whenever the case changes (a check passes, the card is released).
  const cardIssued = Boolean(workerCase?.card);
  useEffect(() => {
    if (!ready || !draft.worker || !workerCase) return;
    if (!cardIssued && !CARD_SCREENS.includes(screen)) return;
    const timer = window.setTimeout(() => void loadCard(), 0);
    return () => window.clearTimeout(timer);
  }, [ready, draft.worker, workerCase, cardIssued, screen, loadCard]);

  useEffect(() => {
    if (!ready || !draft.worker || (screen !== "home" && screen !== "card-so-far" && workerCase)) return;
    const timer = window.setTimeout(() => void loadCase(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, screen, draft.worker]);

  const startDigiLocker = useCallback(async () => {
    setNotice(null);
    try {
      const { url } = await workerCaseApi.startDigiLocker();
      window.location.assign(url);
    } catch (failure) {
      setNotice(failure instanceof Error ? failure.message : "DigiLocker could not be opened. Try again.");
    }
  }, []);

  // While Aadhaar is pending in the app, check for the result every 4 seconds and when the worker returns.
  const aadhaarPending = workerCase?.identity?.status === "PENDING";
  useEffect(() => {
    if (screen !== "home" || !aadhaarPending) return;
    const check = () => void workerCaseApi.completeAadhaar().then((next) => {
      setWorkerCase(next);
      if (next.identity?.status !== "PENDING") setInfo(null);
    }).catch(() => undefined);
    const timer = window.setInterval(check, 4000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [screen, aadhaarPending]);

  // While a check runs, refresh every 4 seconds so states update on their own; while one is in
  // review, every 15 seconds, so a decision (and a released card) shows without a reload.
  const running = workerCase?.checks.some((check) => check.status === "QUEUED" || check.status === "PROCESSING");
  const inReview = workerCase?.checks.some((check) => check.status === "MANUAL_REVIEW");
  useEffect(() => {
    if ((screen !== "home" && screen !== "card-so-far") || (!running && !inReview)) return;
    const timer = window.setInterval(() => void workerCaseApi.get().then(setWorkerCase).catch(() => undefined), running ? 4000 : 15000);
    return () => window.clearInterval(timer);
  }, [screen, running, inReview]);

  const startAadhaar = useCallback(async () => {
    setNotice(null);
    try {
      const { url, intentData } = await workerCaseApi.startAadhaar();
      const appUrl = intentData ? aadhaarAppUrl(intentData) : null;
      if (appUrl) {
        // The Aadhaar app opens over this page; home checks the result when the worker comes back.
        setNotice(null);
        setInfo("Finish in the Aadhaar app, then come back here. Your result appears on its own.");
        window.location.assign(appUrl);
      } else if (!intentData) {
        window.location.assign(url);
      } else {
        setInfo("The Aadhaar app needs a phone. Use DigiLocker here, or open this page on your phone.");
      }
    } catch (failure) {
      setNotice(failure instanceof Error ? failure.message : "Aadhaar could not be opened. Try again.");
    }
  }, []);

  const caseActions: CaseActions = {
    onChooseChecks: () => go("checks"),
    onConsent: () => go("case-consent"),
    onAadhaar: startAadhaar,
    onDigiLocker: startDigiLocker,
    onDetails: () => go("details"),
    onName: () => go("name"),
    onCheck: (check) => {
      if (check === "FACE") return go("selfie");
      update({ formCheck: check as FormCheck });
      go("check-form");
    }
  };
  const next = useNextAction(workerCase, caseActions);
  const nextFooter = next ? <NextStepFooter next={next} notice={notice} /> : undefined;

  function render() {
    const chips = (
      <>
        <LanguageChip code={chip} onClick={openLanguage} />
        {HELP_URL && <HeaderChip href={HELP_URL}>Help</HeaderChip>}
      </>
    );
    const loading = (text: string) => <div className="grid min-h-dvh place-items-center bg-background px-5 text-center text-[14px] text-secondary-text">{notice ?? text}</div>;

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
              // Throws when the passkey is cancelled or rejected; the screen shows why.
              const result = await service.unlock();
              if (result.ok) {
                setWorkerCase(null);
                setCard(null);
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
              // First sign-in asks for the Aadhaar name; a returning worker who chose OTP goes straight home.
              go(!result.worker.fullName ? "name" : returning ? "home" : "verified", { replace: true });
              return "ok";
            }}
          />
        );

      case "name":
        return draft.worker ? (
          <NameScreen
            initial={workerCase?.details.declaredName ?? (workerCase?.status === "DRAFT" ? draft.worker.fullName : "")}
            onBack={workerCase && workerCase.status !== "DRAFT" ? back : undefined}
            language={chip}
            onLanguage={openLanguage}
            onSave={async (fullName) => {
              const saved = await workerCaseApi.saveName(fullName);
              setWorkerCase(saved);
              const name = saved.details.declaredName ?? saved.details.fullName ?? fullName;
              update({ worker: { ...draft.worker!, fullName: name, firstName: name.split(" ")[0] } });
              // Opened from home (case already under way): back to home; at sign-in: carry on.
              go(returning || saved.status !== "DRAFT" ? "home" : "verified", { replace: true });
            }}
          />
        ) : null;

      case "verified":
        return draft.worker ? (
          <VerifiedScreen
            cardNumber={draft.worker.cardNumber}
            onContinue={async () => {
              // Offer quick sign-in only where this phone has its own screen-lock authenticator.
              const canOffer = !draft.quickSignInOffered && (await canUseQuickSignIn());
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

      case "card-so-far":
        if (!card) return loading("Loading your card");
        if (!card.issued) return <CardSoFarScreen card={card} topRight={chips} notice={next ? null : notice} onBack={back} onSeeChecks={() => go("card-checks")} footer={nextFooter} />;
      // falls through: released while the worker looks at the card so far, so show home with the reveal.
      case "home": {
        if (!draft.worker || !workerCase) return loading("Loading your case");
        if (!workerCase.card) {
          return <CaseHomeScreen worker={draft.worker} workerCase={workerCase} language={chip} notice={notice} info={info} onLanguage={openLanguage} onCard={() => go("card-so-far")} {...caseActions} />;
        }
        // The card is released: it is home from now on, with the next step pinned when added checks need something.
        if (!card?.issued) return loading("Loading your card");
        const issued = card;
        if (revealed !== issued.cardNumber && !wasRevealed(issued.cardNumber)) {
          return (
            <CardReveal
              card={issued}
              onDone={() => {
                markRevealed(issued.cardNumber);
                setRevealed(issued.cardNumber);
              }}
            />
          );
        }
        return (
          <CardHomeScreen
            card={issued}
            topRight={chips}
            notice={next ? null : notice}
            info={info}
            footer={nextFooter}
            onShowQr={() => go("card")}
            onSeeChecks={() => go("card-checks")}
            onAddChecks={() => go("add-checks")}
            onReissue={() => go("card-reissue")}
            onSignedOut={signedOut}
          />
        );
      }

      case "card":
        return card?.issued ? <CardScreen card={card} onBack={back} onBigQr={() => go("card-qr")} onSeeChecks={() => go("card-checks")} onSignedOut={signedOut} /> : loading("Loading your card");

      case "card-qr":
        return card?.issued ? <LargeQrScreen card={card} onDone={back} onSignedOut={signedOut} /> : loading("Loading your card");

      case "card-checks":
        return card ? <CardChecksScreen card={card} onBack={back} onAddChecks={() => go("add-checks")} /> : loading("Loading your card");

      case "card-reissue":
        return (
          <ReissueScreen
            card={card?.issued ? card : undefined}
            onBack={back}
            onConfirm={async () => {
              await reissueCard();
              await loadCard();
              go("card", { replace: true });
            }}
          />
        );

      case "add-checks":
        return workerCase ? (
          <ChooseChecksScreen
            adding
            workerCase={workerCase}
            language={chip}
            onBack={back}
            onLanguage={openLanguage}
            onContinue={async (checks: SelectableCheck[]) => {
              update({ adding: checks });
              go("add-consent");
            }}
          />
        ) : loading("Loading your case");

      case "add-consent":
        return workerCase && draft.adding?.length ? (
          <CaseConsentScreen
            workerCase={workerCase}
            adding={draft.adding}
            language={chip}
            onBack={back}
            onLanguage={openLanguage}
            onAgree={async (items) => {
              setWorkerCase(await workerCaseApi.addChecks(draft.adding!, items));
              update({ adding: undefined });
              go("home", { replace: true });
            }}
          />
        ) : null;

      case "checks":
        return workerCase ? (
          <ChooseChecksScreen
            workerCase={workerCase}
            language={chip}
            onBack={back}
            onLanguage={openLanguage}
            onContinue={async (checks: SelectableCheck[]) => {
              setWorkerCase(await workerCaseApi.selectChecks(checks));
              go("case-consent");
            }}
          />
        ) : null;

      case "case-consent":
        return workerCase ? (
          <CaseConsentScreen
            workerCase={workerCase}
            language={chip}
            onBack={back}
            onLanguage={openLanguage}
            onAgree={async (items) => {
              setWorkerCase(await workerCaseApi.consent(items));
              go("home", { replace: true });
            }}
          />
        ) : null;

      case "details":
        return workerCase ? (
          <DetailsScreen
            workerCase={workerCase}
            language={chip}
            onBack={back}
            onLanguage={openLanguage}
            onSave={async (details) => {
              setWorkerCase(await workerCaseApi.saveDetails(details));
              // Explicit, not history.back(): returning from Aadhaar reloads the page and resets history.
              go("home", { replace: true });
            }}
          />
        ) : null;

      case "check-form":
        return draft.formCheck ? (
          <CheckFormScreen
            key={draft.formCheck}
            check={draft.formCheck}
            language={chip}
            onBack={back}
            onLanguage={openLanguage}
            onSubmit={async (input) => {
              setWorkerCase(await workerCaseApi.submitCheck(draft.formCheck!, input));
              // Explicit, not history.back(): returning from Aadhaar reloads the page and resets history.
              go("home", { replace: true });
            }}
          />
        ) : null;

      case "selfie":
        return (
          <SelfieScreen
            language={chip}
            onBack={back}
            onLanguage={openLanguage}
            onSubmit={async (file) => {
              setWorkerCase(await workerCaseApi.submitSelfie(file));
              // Explicit, not history.back(): returning from Aadhaar reloads the page and resets history.
              go("home", { replace: true });
            }}
          />
        );
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
