"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Camera, Check, CircleAlert, Lock } from "lucide-react";
import { StateBadge } from "@/components/state-badge";
import { Button } from "@/components/ui/button";
import { formatPhone, HELP_URL } from "@/lib/onboarding/data";
import type { WorkerProfile } from "@/lib/onboarding/service";
import {
  CHECK_INFO,
  CONSENT_ITEMS,
  chosenChecks,
  consentItemsFor,
  type SelectableCheck,
  type WorkerCase
} from "@/lib/onboarding/worker-case";
import { cn } from "@/lib/utils";
import { Body, CheckRow, ErrorBanner, Footer, HeaderChip, Icon, Kicker, LanguageChip, Lead, PrimaryAction, Screen, StageProgress, TextAction, Title, TopBar } from "./shell";

export type FormCheck = Exclude<SelectableCheck, "AADHAAR" | "FACE" | "ECOURTS_SEARCH">;

/* Choose checks ------------------------------------------------------------- */

export function ChooseChecksScreen({
  workerCase,
  language,
  onBack,
  onLanguage,
  onContinue
}: {
  workerCase: WorkerCase;
  language: string;
  onBack: () => void;
  onLanguage: () => void;
  onContinue: (checks: SelectableCheck[]) => Promise<void>;
}) {
  // The catalogue arrives most important first; unavailable checks are not offered.
  const offered = workerCase.catalog.filter((item) => item.available);
  const [chosen, setChosen] = useState<SelectableCheck[]>(workerCase.selectedChecks);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(check: SelectableCheck, on: boolean) {
    setChosen((current) => {
      let next = on ? [...current, check] : current.filter((item) => item !== check);
      // A check that needs another brings it along, and losing the base drops it.
      const requires = offered.find((item) => item.check === check)?.requires;
      if (on && requires && !next.includes(requires)) next = [...next, requires];
      if (!on) next = next.filter((item) => offered.find((entry) => entry.check === item)?.requires !== check);
      return offered.map((item) => item.check).filter((item) => next.includes(item));
    });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onContinue(chosen);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Your choice was not saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TopBar onBack={onBack} step="Your checks · 1 of 2" right={<LanguageChip code={language} onClick={onLanguage} />} />
      <StageProgress stage={1} />
      <Body className="pt-6">
        <Title>What can you verify?</Title>
        <Lead className="mt-2 mb-[18px] text-[14.5px]">Pick the documents you have with you. You can skip the rest.</Lead>
        <fieldset className="m-0 border-0 border-t border-border p-0">
          <legend className="sr-only">Checks to run</legend>
          {offered.map((item) => (
            <CheckRow
              key={item.check}
              checked={chosen.includes(item.check)}
              onToggle={(on) => toggle(item.check, on)}
              title={CHECK_INFO[item.check].title}
              detail={item.requires ? `${CHECK_INFO[item.check].detail} Needs ${CHECK_INFO[item.requires].title}.` : CHECK_INFO[item.check].detail}
            />
          ))}
        </fieldset>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </Body>
      <Footer>
        <PrimaryAction busy={busy} blockedBy={chosen.length ? undefined : "Pick at least one check"} onClick={submit}>
          Continue · {chosen.length} {chosen.length === 1 ? "check" : "checks"}
        </PrimaryAction>
      </Footer>
    </Screen>
  );
}

/* Consent for the chosen checks -------------------------------------------- */

export function CaseConsentScreen({
  workerCase,
  language,
  onBack,
  onLanguage,
  onAgree
}: {
  workerCase: WorkerCase;
  language: string;
  onBack: () => void;
  onLanguage: () => void;
  onAgree: (items: string[]) => Promise<void>;
}) {
  const items = consentItemsFor(workerCase, workerCase.selectedChecks);
  // Nothing is pre-ticked and there is no "agree to all" (DESIGN.md §13).
  const [approved, setApproved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = items.filter((item) => !approved.includes(item)).length;

  async function agree() {
    setBusy(true);
    setError(null);
    try {
      await onAgree(approved);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Your approvals were not saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TopBar onBack={onBack} step="Your checks · 2 of 2" right={<LanguageChip code={language} onClick={onLanguage} />} />
      <StageProgress stage={1} />
      <Body className="pt-6">
        <Title>Approve each check</Title>
        <Lead className="mt-2 mb-[18px] text-[14.5px]">We record what you approve, why, and when.</Lead>
        <fieldset className="m-0 border-0 border-t border-border p-0">
          <legend className="sr-only">Approvals</legend>
          {items.map((id) => (
            <CheckRow
              key={id}
              checked={approved.includes(id)}
              onToggle={(on) => setApproved((current) => (on ? [...current, id] : current.filter((item) => item !== id)))}
              title={CONSENT_ITEMS[id]?.title ?? id}
              detail={CONSENT_ITEMS[id]?.detail ?? ""}
            />
          ))}
        </fieldset>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <TextAction href="/privacy" className="mt-2 self-start">Read full privacy notice</TextAction>
      </Body>
      <Footer>
        <PrimaryAction busy={busy} blockedBy={left > 0 ? `Agree · ${left} left to approve` : undefined} onClick={agree}>
          Agree and start
        </PrimaryAction>
      </Footer>
    </Screen>
  );
}

/* Worker home: the real case ------------------------------------------------ */

type NextAction = { title: string; detail: string; label: string; run: () => void; secondary?: { label: string; run: () => void } };

export function CaseHomeScreen({
  worker,
  workerCase,
  language,
  notice,
  info,
  onLanguage,
  onChooseChecks,
  onConsent,
  onAadhaar,
  onDigiLocker,
  onDetails,
  onCheck
}: {
  worker: WorkerProfile;
  workerCase: WorkerCase;
  language: string;
  notice?: string | null;
  /** Guidance, not an error (e.g. finish in the Aadhaar app). */
  info?: string | null;
  onLanguage: () => void;
  onChooseChecks: () => void;
  onConsent: () => void;
  onAadhaar: () => void;
  onDigiLocker: () => void;
  onDetails: () => void;
  onCheck: (check: SelectableCheck) => void;
}) {
  const rows = chosenChecks(workerCase);
  const verified = rows.filter((row) => row.state === "verified").length;
  const name = workerCase.details.fullName || worker.fullName;
  const aadhaarChosen = workerCase.selectedChecks.includes("AADHAAR");
  // A chosen Aadhaar comes first: the other checks are matched to the name and photo it returns.
  const aadhaarPending = aadhaarChosen && workerCase.identity?.status !== "VERIFIED";
  const needsDetails = !aadhaarChosen && (!workerCase.details.fullName || !workerCase.details.dateOfBirth);

  function actionFor(check: SelectableCheck) {
    if (check === "AADHAAR") return onAadhaar;
    if (check === "ECOURTS_SEARCH") return onDetails;
    return () => onCheck(check);
  }

  const next = useMemo<NextAction | null>(() => {
    if (workerCase.status === "DRAFT" && !workerCase.selectedChecks.length) {
      return { title: "Choose your checks", detail: "Pick the documents you have. About 1 minute.", label: "Start", run: onChooseChecks };
    }
    if (workerCase.status === "DRAFT") return { title: "Approve your checks", detail: "Say yes to each check before it runs.", label: "Start", run: onConsent };
    const aadhaar = rows.find((row) => row.check === "AADHAAR" && (row.needsInput || row.canResubmit));
    if (aadhaar) {
      return {
        title: "Verify your Aadhaar",
        detail: "Use the Aadhaar app, or DigiLocker if the app does not work. Your other checks are matched to it.",
        label: "Open Aadhaar app",
        run: onAadhaar,
        secondary: { label: "Use DigiLocker", run: onDigiLocker }
      };
    }
    if (needsDetails) return { title: "Add your date of birth", detail: "As printed on your ID. Checks are matched to your name and date of birth.", label: "Add details", run: onDetails };
    const open = rows.find((row) => row.needsInput || row.canResubmit);
    if (open) {
      return {
        title: open.check === "FACE" ? (open.canResubmit ? "Take your selfie again" : "Take a selfie") : `${open.canResubmit ? "Fix" : "Add"} your ${CHECK_INFO[open.check].title}`,
        detail: open.reason ?? CHECK_INFO[open.check].detail,
        label: open.canResubmit ? "Fix" : "Add",
        run: actionFor(open.check)
      };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerCase]);

  return (
    <Screen>
      <TopBar
        right={
          <>
            <LanguageChip code={language} onClick={onLanguage} />
            {HELP_URL && <HeaderChip href={HELP_URL}>Help</HeaderChip>}
          </>
        }
      />
      <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-paper">
        <div className="border-b border-border bg-background px-5 pt-6 pb-[22px]">
          <Kicker className="tracking-[0.12em]">Namaste</Kicker>
          <Title className="mt-1.5 mb-5">{name || `+91 ${formatPhone(worker.phone)}`}</Title>
          <div className="border-t border-line-soft pt-4">
            <Kicker className="tracking-[0.12em]">Liwip BGV Card</Kicker>
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <span className="tabular min-w-0 font-mono text-[14px] font-medium">{workerCase.cardNumber ?? "Issued after mobile check"}</span>
              {rows.length > 0 && (
                <span className="tabular flex-none font-mono text-[12px] font-medium whitespace-nowrap text-secondary-text">
                  <span className="text-state-verified">{verified}</span> / {rows.length} verified
                </span>
              )}
            </div>
            <ul className="mt-1.5 mb-0 list-none p-0">
              <li className="flex items-center justify-between gap-2.5 border-b border-line-soft py-[9px]">
                <span className="text-[13.5px]">Mobile · +91 {formatPhone(worker.phone)}</span>
                <StateBadge state="verified" className="shrink-0" />
              </li>
              {rows.map((row) => (
                <li key={row.check} className="border-b border-line-soft py-[9px] last:border-b-0">
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="text-[13.5px]">{CHECK_INFO[row.check].title}</span>
                    {row.needsInput && aadhaarPending && row.check !== "AADHAAR" ? (
                      <StateBadge state="queued" label="After Aadhaar" className="shrink-0" />
                    ) : row.needsInput ? (
                      <button type="button" onClick={actionFor(row.check)} className="label-mono min-h-11 px-1 text-[11px] tracking-[0.1em] text-accent-foreground hover:underline">
                        Add
                      </button>
                    ) : (
                      <StateBadge state={row.state} className="shrink-0" />
                    )}
                  </div>
                  {row.state === "fix" && (
                    <div className="mt-1 flex items-start justify-between gap-3">
                      <p className="m-0 text-[13px] leading-[1.5] text-state-fix">{row.reason ?? "This did not match. Check what you entered."}</p>
                      {row.canResubmit && (
                        <button type="button" onClick={actionFor(row.check)} className="label-mono min-h-11 flex-none px-1 text-[11px] tracking-[0.1em] text-accent-foreground hover:underline">
                          Fix
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {workerCase.card && <p className="mt-2.5 mb-0 text-[13px] text-secondary-text">Card valid until {new Date(workerCase.card.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.</p>}
          </div>
        </div>

        {notice && <div className="px-5"><ErrorBanner>{notice}</ErrorBanner></div>}
        {info && (
          <div className="px-5">
            <p role="status" className="mt-4 mb-0 border border-border bg-background px-3.5 py-3 text-[13px] leading-[1.5] text-secondary-text">{info}</p>
          </div>
        )}

        {!next && (
          <section className="px-5 pt-5 pb-6">
            <Kicker className="mb-2.5 tracking-[0.12em]">Status</Kicker>
            <p className="m-0 text-[14px] leading-[1.55] text-secondary-text">
              {rows.some((row) => row.running) ? "Your checks are running. This page updates on its own." : "Nothing more is needed from you right now."}
            </p>
          </section>
        )}
        <div className="h-4 flex-none" />
      </main>
      {next ? (
        // The next step is pinned so its action is always in reach; the checks above scroll.
        // Inverted so the whole next step stands out, not only its button.
        <footer className="flex-none bg-primary px-5 pt-3.5 pb-[max(14px,env(safe-area-inset-bottom))] text-primary-foreground">
          <Kicker className="mb-1.5 tracking-[0.12em] text-primary-foreground">Your next step</Kicker>
          <h2 className="mt-0 mb-0.5 text-[17px] font-medium tracking-[-0.015em]">{next.title}</h2>
          <p className="mt-0 mb-3 line-clamp-2 text-[13px] leading-[1.5] text-primary-foreground/85">{next.detail}</p>
          <Button onClick={next.run} className="h-[52px] w-full justify-between bg-background px-4 text-foreground hover:bg-paper focus-visible:outline-background">
            {next.label} <Icon icon={ArrowRight} size={13} strokeWidth={2.4} />
          </Button>
          {next.secondary && (
            <Button onClick={next.secondary.run} className="mt-2 h-12 w-full justify-between border border-primary-foreground bg-transparent px-4 text-primary-foreground hover:bg-primary-foreground/10 focus-visible:outline-background">
              {next.secondary.label} <Icon icon={ArrowRight} size={13} strokeWidth={2.4} />
            </Button>
          )}
        </footer>
      ) : (
        <footer className="flex flex-none items-center gap-2 border-t border-border bg-background px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] text-[13px] text-secondary-text">
          <Icon icon={Lock} size={12} strokeWidth={2} />
          Your details are used only for these checks.
        </footer>
      )}
    </Screen>
  );
}

/* Shared single-line field --------------------------------------------------- */

function Field({
  id,
  label,
  help,
  value,
  onChange,
  placeholder,
  valid,
  invalid,
  inputMode,
  type = "text",
  width,
  autoComplete,
  mono = true
}: {
  id: string;
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  valid?: boolean;
  invalid?: boolean;
  inputMode?: "text" | "numeric";
  type?: "text" | "date";
  width?: number;
  autoComplete?: string;
  mono?: boolean;
}) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="label-mono mb-1.5 block">{label}</label>
      {help && <p className="mt-0 mb-2 text-[13px] text-secondary-text">{help}</p>}
      <div
        style={width ? { maxWidth: width } : undefined}
        className={cn(
          "flex h-[52px] border transition-colors focus-within:outline-[1.5px] focus-within:outline-offset-2",
          invalid ? "border-destructive focus-within:outline-destructive" : value ? "border-foreground focus-within:outline-primary" : "border-border focus-within:outline-primary"
        )}
      >
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete ?? "off"}
          spellCheck={false}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn("min-w-0 flex-1 bg-transparent px-3.5 text-[16px] outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground", mono && "tabular font-mono font-medium tracking-[0.04em]")}
        />
        <span className="grid w-11 flex-none place-items-center">
          {valid && <Icon icon={Check} size={16} strokeWidth={3} className="text-state-verified" />}
          {invalid && <Icon icon={CircleAlert} size={16} strokeWidth={2.4} className="text-destructive" />}
        </span>
      </div>
    </div>
  );
}

function FormScreen({
  step,
  stage = 2,
  title,
  lead,
  language,
  onBack,
  onLanguage,
  blockedBy,
  busy,
  error,
  submitLabel,
  onSubmit,
  children
}: {
  step: string;
  stage?: number;
  title: string;
  lead: string;
  language: string;
  onBack?: () => void;
  onLanguage: () => void;
  blockedBy?: string;
  busy: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Screen>
      <TopBar onBack={onBack} step={step} right={<LanguageChip code={language} onClick={onLanguage} />} />
      <StageProgress stage={stage} />
      <Body className="pt-6">
        <Title>{title}</Title>
        <Lead className="mt-2 mb-[22px] text-[14.5px]">{lead}</Lead>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!blockedBy && !busy) onSubmit();
          }}
        >
          {children}
          <button type="submit" className="sr-only" tabIndex={-1}>{submitLabel}</button>
        </form>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </Body>
      <Footer>
        <PrimaryAction busy={busy} blockedBy={blockedBy} onClick={onSubmit}>{submitLabel}</PrimaryAction>
      </Footer>
    </Screen>
  );
}

function useSubmit(action: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

/* Name, right after OTP -------------------------------------------------------- */

export function NameScreen({
  initial,
  language,
  onLanguage,
  onSave
}: {
  initial: string;
  language: string;
  onLanguage: () => void;
  onSave: (fullName: string) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(initial);
  const valid = /^[\p{L} .'-]{2,80}$/u.test(fullName.trim());
  const { busy, error, run } = useSubmit(() => onSave(fullName.trim().replace(/\s+/g, " ")));

  return (
    <FormScreen
      step="Sign in · 2 of 2"
      stage={0}
      title="What is your name?"
      lead="Write it exactly as on your Aadhaar card. Your checks are matched to this name."
      language={language}
      onLanguage={onLanguage}
      blockedBy={valid ? undefined : "Add your name"}
      busy={busy}
      error={error}
      submitLabel="Continue"
      onSubmit={run}
    >
      <Field id="aadhaar-name" label="Full name as on Aadhaar" value={fullName} onChange={(value) => setFullName(value.slice(0, 80))} placeholder="Sandeep Kumar Meena" valid={valid} autoComplete="name" mono={false} />
    </FormScreen>
  );
}

/* Details: name, DOB, father's name, address -------------------------------- */

export function DetailsScreen({
  workerCase,
  language,
  onBack,
  onLanguage,
  onSave
}: {
  workerCase: WorkerCase;
  language: string;
  onBack: () => void;
  onLanguage: () => void;
  onSave: (details: { fullName?: string; dateOfBirth?: string; fatherName?: string; address?: string }) => Promise<void>;
}) {
  const fromAadhaar = workerCase.details.source === "AADHAAR";
  const court = workerCase.selectedChecks.includes("ECOURTS_SEARCH");
  const [fullName, setFullName] = useState(workerCase.details.fullName ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(workerCase.details.dateOfBirth ?? "");
  const [fatherName, setFatherName] = useState(workerCase.details.fatherName ?? "");
  const [address, setAddress] = useState(workerCase.details.address ?? "");
  const askName = !fromAadhaar && !workerCase.selectedChecks.includes("AADHAAR");
  const askFather = court && !workerCase.details.fatherName;
  const askAddress = court && !workerCase.details.address;

  const nameOk = /^[\p{L} .'-]{2,80}$/u.test(fullName.trim());
  const dobOk = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) && new Date(dateOfBirth) < new Date();
  const fatherOk = /^[\p{L} .'-]{2,80}$/u.test(fatherName.trim());
  const addressOk = address.trim().length >= 10;
  const blockedBy = askName && !nameOk ? "Add your full name" : askName && !dobOk ? "Add your date of birth" : askFather && !fatherOk ? "Add your father's name" : askAddress && !addressOk ? "Add your address" : undefined;

  const { busy, error, run } = useSubmit(() =>
    onSave({
      ...(askName ? { fullName: fullName.trim(), dateOfBirth } : {}),
      ...(askFather ? { fatherName: fatherName.trim() } : {}),
      ...(askAddress ? { address: address.trim() } : {})
    })
  );

  return (
    <FormScreen
      step="Your details"
      title={askName ? "Your name and date of birth" : "A few more details"}
      lead={askName ? "As printed on your ID. Every check is matched to this name." : "Needed for the court records search."}
      language={language}
      onBack={onBack}
      onLanguage={onLanguage}
      blockedBy={blockedBy}
      busy={busy}
      error={error}
      submitLabel="Save details"
      onSubmit={run}
    >
      {askName && (
        <>
          <Field id="full-name" label="Full name" value={fullName} onChange={setFullName} placeholder="As on your ID" valid={nameOk} autoComplete="name" mono={false} />
          <Field id="dob" label="Date of birth" type="date" value={dateOfBirth} onChange={setDateOfBirth} valid={dobOk} width={215} autoComplete="bday" />
        </>
      )}
      {askFather && <Field id="father-name" label="Father's name" value={fatherName} onChange={setFatherName} valid={fatherOk} mono={false} />}
      {askAddress && <Field id="address" label="Address with PIN code" value={address} onChange={(value) => setAddress(value.slice(0, 300))} valid={addressOk} autoComplete="street-address" mono={false} />}
    </FormScreen>
  );
}

/* One document check --------------------------------------------------------- */

const FORMS: Record<FormCheck, { field: string; label: string; help: string; placeholder: string; pattern: RegExp; maxLength: number; width: number; numeric?: boolean; clean: (value: string) => string }> = {
  PAN: { field: "panNumber", label: "PAN", help: "10 characters, on the front of your PAN card.", placeholder: "ABCDE1234F", pattern: /^[A-Z]{5}\d{4}[A-Z]$/, maxLength: 10, width: 250, clean: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "") },
  DRIVING_LICENSE: { field: "licenceNumber", label: "Driving licence number", help: "As printed on your licence, without spaces.", placeholder: "KA0120190001234", pattern: /^[A-Z]{2}[0-9A-Z]{8,16}$/, maxLength: 18, width: 300, clean: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "") },
  VOTER_ID: { field: "voterId", label: "Voter ID (EPIC) number", help: "3 letters and 7 digits.", placeholder: "ABC1234567", pattern: /^[A-Z]{3}\d{7}$/, maxLength: 10, width: 250, clean: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "") },
  PASSPORT: { field: "fileNumber", label: "Passport file number", help: "On your passport application receipt.", placeholder: "BN1068234567890", pattern: /^[A-Z0-9]{10,15}$/, maxLength: 15, width: 300, clean: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "") },
  RC_V2: { field: "registrationNumber", label: "Vehicle number", help: "As on your RC or number plate.", placeholder: "KA01AB1234", pattern: /^[A-Z0-9]{6,12}$/, maxLength: 12, width: 250, clean: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "") },
  EMPLOYMENT_HISTORY: { field: "uan", label: "UAN", help: "12 digits, on your salary slip or the EPFO app.", placeholder: "100123456789", pattern: /^\d{12}$/, maxLength: 12, width: 250, numeric: true, clean: (v) => v.replace(/\D/g, "") }
};

export function CheckFormScreen({
  check,
  language,
  onBack,
  onLanguage,
  onSubmit
}: {
  check: FormCheck;
  language: string;
  onBack: () => void;
  onLanguage: () => void;
  onSubmit: (input: Record<string, string>) => Promise<void>;
}) {
  const form = FORMS[check];
  const [value, setValue] = useState("");
  const valid = form.pattern.test(value);
  const invalid = value.length >= form.maxLength && !valid;
  const { busy, error, run } = useSubmit(() => onSubmit({ [form.field]: value }));

  return (
    <FormScreen
      step="Your details"
      title={`Your ${CHECK_INFO[check].title}`}
      lead="We check it with the issuing authority and match it to your name."
      language={language}
      onBack={onBack}
      onLanguage={onLanguage}
      blockedBy={valid ? undefined : invalid ? `Check the ${form.label}` : `Add your ${form.label}`}
      busy={busy}
      error={error}
      submitLabel="Verify"
      onSubmit={run}
    >
      <Field
        id={`check-${check}`}
        label={form.label}
        help={form.help}
        value={value}
        onChange={(next) => setValue(form.clean(next).slice(0, form.maxLength))}
        placeholder={form.placeholder}
        valid={valid}
        invalid={invalid}
        inputMode={form.numeric ? "numeric" : "text"}
        width={form.width}
      />
    </FormScreen>
  );
}

/* Selfie ---------------------------------------------------------------------- */

export function SelfieScreen({
  language,
  onBack,
  onLanguage,
  onSubmit
}: {
  language: string;
  onBack: () => void;
  onLanguage: () => void;
  onSubmit: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const tooLarge = Boolean(file && file.size > 5 * 1024 * 1024);
  const { busy, error, run } = useSubmit(() => onSubmit(file!));

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <FormScreen
      step="Your details"
      title="Take a selfie"
      lead="Face the camera in good light, without a cap or glasses. We match it to your Aadhaar photo."
      language={language}
      onBack={onBack}
      onLanguage={onLanguage}
      blockedBy={!file ? "Take a photo first" : tooLarge ? "Photo is over 5 MB" : undefined}
      busy={busy}
      error={error}
      submitLabel="Use this photo"
      onSubmit={run}
    >
      <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-border bg-paper p-4 text-center focus-within:outline-[1.5px] focus-within:outline-offset-2 focus-within:outline-primary">
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your selfie" className="max-h-[260px] w-auto object-contain" />
        ) : (
          <>
            <Icon icon={Camera} size={26} strokeWidth={1.6} className="text-secondary-text" />
            <span className="label-mono">Open camera</span>
          </>
        )}
      </label>
      {file && <TextAction onClick={() => setFile(null)} className="mt-2">Take another</TextAction>}
    </FormScreen>
  );
}
