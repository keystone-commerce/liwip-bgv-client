"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Fingerprint, MessageSquare, Users } from "lucide-react";
import { StateBadge } from "@/components/state-badge";
import { formatPhone, LANGUAGES, type LanguageCode } from "@/lib/onboarding/data";
import { ONBOARDING_TEST_MODE, TEST_OTP, TEST_PHONE } from "@/lib/onboarding/test-mode";
import { cn } from "@/lib/utils";
import { GigCard, GigCardRow } from "./gig-card";
import {
  Body,
  ChoiceRow,
  ErrorBanner,
  Footer,
  Icon,
  LanguageChip,
  Lead,
  PrimaryAction,
  RadioMark,
  Screen,
  SecondaryAction,
  StageProgress,
  TextAction,
  Title,
  TopBar
} from "./shell";

/* 02 Language ------------------------------------------------------------ */

export function LanguageScreen({ value, onBack, onContinue }: { value: LanguageCode; onBack?: () => void; onContinue: (code: LanguageCode) => void }) {
  const [selected, setSelected] = useState<LanguageCode>(value);
  return (
    <Screen>
      <TopBar onBack={onBack} />
      <Body className="pt-[26px]">
        <Title>Choose your language</Title>
        <p lang="hi" className="mt-1.5 mb-[22px] text-[20px] leading-[1.3] text-muted-foreground">अपनी भाषा चुनें</p>
        <fieldset className="m-0 border-0 border-t border-border p-0">
          <legend className="sr-only">Language</legend>
          {LANGUAGES.map((language) => (
            <ChoiceRow
              key={language.code}
              name="language"
              value={language.code}
              checked={selected === language.code}
              onSelect={(code) => setSelected(code as LanguageCode)}
              className="min-h-14"
              leading={<RadioMark checked={selected === language.code} />}
              trailing={
                <span className={cn("label-mono tracking-[0.1em]", selected === language.code ? "text-accent-foreground" : "text-muted-foreground")}>
                  {language.english}
                </span>
              }
            >
              <span lang={language.code} className={cn("text-[17px]", selected === language.code && "font-medium")}>{language.native}</span>
            </ChoiceRow>
          ))}
        </fieldset>
        <p className="mt-4 mb-0 text-[13px] text-muted-foreground">You can change this any time from the top bar.</p>
      </Body>
      <Footer>
        <PrimaryAction onClick={() => onContinue(selected)}>Continue</PrimaryAction>
      </Footer>
    </Screen>
  );
}

/* 03 Mobile number ------------------------------------------------------- */

const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function MobileScreen({
  initial,
  language,
  onBack,
  onLanguage,
  onSend
}: {
  initial: string;
  language: string;
  onBack: () => void;
  onLanguage: () => void;
  onSend: (phone: string) => Promise<void>;
}) {
  const [digits, setDigits] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const complete = digits.length === 10;
  const valid = MOBILE_PATTERN.test(digits);
  const invalid = complete && !valid;

  async function send() {
    setBusy(true);
    setFailed(false);
    try {
      await onSend(ONBOARDING_TEST_MODE && !valid ? TEST_PHONE : digits);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const blockedBy = !complete ? `Send code · ${10 - digits.length} ${10 - digits.length === 1 ? "digit" : "digits"} left` : invalid ? "Check the number" : undefined;

  return (
    <Screen>
      <TopBar onBack={onBack} step="Sign in · 1 of 2" right={<LanguageChip code={language} onClick={onLanguage} />} />
      <StageProgress stage={0} />
      <Body>
        <Title>Enter your mobile number</Title>
        <Lead className="mb-[26px]">This number becomes your worker ID. Use the one linked to your Aadhaar if you can.</Lead>
        <label htmlFor="mobile" className="label-mono mb-2 block">Mobile number</label>
        <div
          className={cn(
            "flex h-14 border transition-colors focus-within:border-foreground focus-within:outline-[1.5px] focus-within:outline-offset-2 focus-within:outline-primary",
            invalid ? "border-destructive focus-within:border-destructive focus-within:outline-destructive" : digits ? "border-foreground" : "border-border"
          )}
        >
          <span className="tabular grid w-[68px] flex-none place-items-center border-r border-border bg-paper font-mono text-[16px] font-medium">+91</span>
          <input
            id="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            autoFocus
            placeholder="98765 43210"
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? "mobile-invalid" : undefined}
            value={formatPhone(digits)}
            onChange={(event) => setDigits(event.target.value.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").slice(0, 10))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !blockedBy) void send();
            }}
            className="tabular min-w-0 flex-1 bg-transparent px-3.5 font-mono text-[18px] font-medium tracking-[0.06em] outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground"
          />
          <span className="grid w-11 flex-none place-items-center">
            {valid && <Icon icon={Check} size={16} strokeWidth={3} className="text-state-verified" />}
            {invalid && <Icon icon={CircleAlert} size={16} strokeWidth={2.4} className="text-destructive" />}
          </span>
        </div>
        {invalid && <span id="mobile-invalid" className="sr-only">Indian mobile numbers start with 6, 7, 8 or 9.</span>}
        {failed && <ErrorBanner>We could not send the code. Check your connection and try again.</ErrorBanner>}
        <div className="mt-[22px] flex items-start gap-2.5 border-t border-border pt-4">
          <Icon icon={MessageSquare} size={14} strokeWidth={2} className="mt-[3px] flex-none text-muted-foreground" />
          <p className="m-0 text-[13px] leading-[1.55] text-muted-foreground">We send one SMS with a 6-digit code. No marketing messages, ever.</p>
        </div>
      </Body>
      <Footer>
        <PrimaryAction blockedBy={blockedBy} busy={busy} onClick={send}>Send code</PrimaryAction>
      </Footer>
    </Screen>
  );
}

/* 04 OTP ------------------------------------------------------------------- */

type OtpCredential = Credential & { code: string };

export function OtpScreen({
  phone,
  language,
  resendAfter,
  onBack,
  onLanguage,
  onChangeNumber,
  onResend,
  onVerify
}: {
  phone: string;
  language: string;
  resendAfter: number;
  onBack: () => void;
  onLanguage: () => void;
  onChangeNumber: () => void;
  onResend: () => Promise<number>;
  onVerify: (code: string) => Promise<"ok" | "wrong-code" | "expired">;
}) {
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"wrong-code" | "expired" | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(resendAfter);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  // Android Chrome: read the code from an SMS that ends with "@liwip.in #<code>" (DESIGN.md §13).
  useEffect(() => {
    if (!("OTPCredential" in window)) return;
    const controller = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: controller.signal } as CredentialRequestOptions)
      .then((credential) => {
        const otp = (credential as OtpCredential | null)?.code;
        if (otp && /^\d{6}$/.test(otp)) {
          setCode(otp);
          void verify(otp);
        }
      })
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(value = code) {
    if (ONBOARDING_TEST_MODE && value.length < 6) value = TEST_OTP;
    setBusy(true);
    setError(null);
    try {
      const result = await onVerify(value);
      if (result !== "ok") {
        setError(result);
        setCode("");
        inputRef.current?.focus();
      }
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setCode("");
    setSecondsLeft(await onResend());
    inputRef.current?.focus();
  }

  const left = 6 - code.length;
  const activeIndex = Math.min(code.length, 5);

  return (
    <Screen>
      <TopBar onBack={onBack} step="Sign in · 2 of 2" right={<LanguageChip code={language} onClick={onLanguage} />} />
      <StageProgress stage={0} />
      <Body>
        <Title>Enter the 6-digit code</Title>
        <Lead className="mb-[26px] flex flex-wrap items-center gap-x-1">
          Sent to <span className="tabular font-mono text-[14px] font-medium text-foreground">+91 {formatPhone(phone)}</span>.
          <TextAction onClick={onChangeNumber} className="min-h-0 py-3 text-[13px] normal-case tracking-normal font-sans">Change</TextAction>
        </Lead>

        <div className="relative">
          <label htmlFor="otp" className="sr-only">6-digit code</label>
          <input
            ref={inputRef}
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            aria-invalid={error ? true : undefined}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => {
              setError(null);
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && code.length === 6) void verify();
            }}
            className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
          />
          <div aria-hidden="true" className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }, (_, index) => {
              const digit = code[index];
              const active = focused && index === activeIndex && code.length < 6;
              return (
                <span
                  key={index}
                  className={cn(
                    "tabular grid h-[58px] place-items-center border font-mono text-[22px] font-medium",
                    error ? "border-destructive" : active ? "border-primary outline-[1.5px] outline-offset-2 outline-primary" : digit ? "border-foreground" : "border-border bg-paper"
                  )}
                >
                  {digit ?? (active && <span className="h-6 w-[1.5px] animate-pulse bg-primary" />)}
                </span>
              );
            })}
          </div>
        </div>

        {error && (
          <ErrorBanner>
            {error === "expired" ? "That code has expired. Get a new code and try again." : "That code did not match. Check the SMS and try again."}
          </ErrorBanner>
        )}

        <div className="mt-[18px] flex items-center justify-between">
          <StateBadge state="checking" label="Waiting for SMS" />
          {secondsLeft > 0 ? (
            <span className="tabular font-mono text-[11.5px] text-muted-foreground">
              Resend in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </span>
          ) : (
            <TextAction onClick={resend}>Resend code</TextAction>
          )}
        </div>

        <p className="mt-7 mb-0 border-t border-border pt-4 text-[13px] leading-[1.55] text-muted-foreground">
          Didn’t get it? Check that the number is right, then wait for the timer. You can also get the code on a call.
        </p>
      </Body>
      <Footer>
        <PrimaryAction
          arrow={false}
          busy={busy}
          blockedBy={left > 0 ? `Verify · ${left} ${left === 1 ? "digit" : "digits"} left` : undefined}
          onClick={() => verify()}
        >
          Verify
        </PrimaryAction>
      </Footer>
    </Screen>
  );
}

/* 05 Number verified ----------------------------------------------------- */

export function VerifiedScreen({ applicationId, onContinue }: { applicationId: string; onContinue: () => void }) {
  return (
    <Screen>
      <TopBar />
      <StageProgress stage={0} complete />
      <Body className="pt-11">
        <span className="grid size-14 place-items-center border border-state-verified-border bg-state-verified-bg text-state-verified">
          <Icon icon={Check} size={26} strokeWidth={2.4} />
        </span>
        <h1 className="mt-[22px] mb-2.5 text-[30px] leading-[1.1] font-medium tracking-[-0.026em]">
          Number verified. <span className="text-muted-foreground">Your card has started.</span>
        </h1>
        <p className="m-0 text-[15px] leading-[1.55] text-muted-foreground">Every check you pass is added here. The card stays yours, even if you change platforms.</p>
        <GigCard applicationId={applicationId} className="mt-[26px]">
          <div className="px-3 pt-0.5 pb-1">
            <GigCardRow label="Mobile number" state="verified" />
            <GigCardRow label="Checks for your work" state="queued" stateLabel="Next" muted />
          </div>
        </GigCard>
      </Body>
      <Footer>
        <PrimaryAction onClick={onContinue}>Continue</PrimaryAction>
      </Footer>
    </Screen>
  );
}

/* 05b Quick sign-in ------------------------------------------------------ */

export function QuickSignInScreen({ onEnable, onSkip }: { onEnable: () => Promise<void>; onSkip: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function enable() {
    setBusy(true);
    setFailed(false);
    try {
      await onEnable();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TopBar right={<span className="label-mono pr-3 text-muted-foreground">Optional</span>} />
      <Body className="pt-10">
        <span className="grid size-16 place-items-center border border-blue-line bg-accent text-accent-foreground">
          <Icon icon={Fingerprint} size={30} strokeWidth={1.5} />
        </span>
        <Title className="mt-[22px] mb-2.5">Sign in faster next time</Title>
        {/* Copy never names a biometric; the OS decides between fingerprint, face and PIN (DESIGN.md §13). */}
        <p className="m-0 text-[15px] leading-[1.55] text-muted-foreground">No code to wait for. You unlock Liwip the same way you unlock your phone, with your phone’s screen lock.</p>
        <div className="mt-[22px] border-t border-border">
          <p className="label-mono m-0 pt-3 pb-0.5 text-muted-foreground">One touch to</p>
          <ul className="m-0 list-none p-0">
            {["Continue your application", "Check your results", "Show your Gig Card"].map((item) => (
              <li key={item} className="flex items-center gap-3 border-b border-line-soft py-[11px] text-[14px] last:border-b-0">
                <span aria-hidden="true" className="size-[5px] flex-none bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        {failed && <ErrorBanner>Quick sign-in could not be turned on. You can keep using OTP.</ErrorBanner>}
        <div className="mt-auto flex items-start gap-2.5 border border-state-review-border bg-state-review-bg px-3.5 py-3">
          <Icon icon={Users} size={14} strokeWidth={2} className="mt-[3px] flex-none text-state-review" />
          <p className="m-0 text-[13px] leading-[1.5]">Shared phone? Skip this. Anyone who can unlock this phone could open your account.</p>
        </div>
      </Body>
      <Footer>
        <PrimaryAction icon={Fingerprint} busy={busy} onClick={enable}>Turn on quick sign-in</PrimaryAction>
        <SecondaryAction onClick={onSkip}>Not now, use OTP</SecondaryAction>
      </Footer>
    </Screen>
  );
}
