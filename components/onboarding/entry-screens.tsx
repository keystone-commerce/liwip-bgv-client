"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { StateBadge } from "@/components/state-badge";
import { maskPhone } from "@/lib/onboarding/data";
import type { ReturningWorker } from "@/lib/onboarding/service";
import { cn } from "@/lib/utils";
import { CheckBar, BgvCard } from "./bgv-card";
import { Body, Footer, Icon, Kicker, LanguageChip, NumberedStep, PrimaryAction, Screen, SecondaryAction, TextAction, TopBar } from "./shell";

const ENTRY_STEPS = [
  { title: "Pick your work", detail: "We match the checks platforms ask for" },
  { title: "Share from DigiLocker", detail: "No typing for most people" },
  { title: "Keep your Liwip BGV Card", detail: "Reuse it for 12 months" }
];

// Allowed gradients (DESIGN.md §7). One blue: rising from below the fold on entry,
// a soft field from the top on welcome back.
const ENTRY_BLOOM = {
  light: "radial-gradient(120% 56% at 50% 114%, rgba(44,98,246,0.34) 0%, rgba(44,98,246,0.12) 34%, rgba(255,255,255,0) 68%)",
  dark: "radial-gradient(120% 60% at 50% 112%, rgba(60,118,255,0.95) 0%, rgba(38,80,205,0.42) 32%, rgba(11,11,12,0) 66%)"
};
const WELCOME_BLOOM = "radial-gradient(110% 44% at 50% 0%, rgba(44,98,246,0.16) 0%, rgba(44,98,246,0.04) 45%, rgba(255,255,255,0) 72%)";

/** Flips to true one frame after mount, so a CSS transition has a starting state to leave. */
function useEntered() {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(frame);
  }, []);
  return entered;
}

/** 01 Entry. Light is 2a; dark is 1b, the only dark surface in the product (DESIGN.md §13). */
export function EntryScreen({ tone, language, onStart, onLanguage }: { tone: "light" | "dark"; language: string; onStart: () => void; onLanguage: () => void }) {
  const dark = tone === "dark";
  const entered = useEntered();
  return (
    <Screen tone={tone}>
      {/* The glow fades in each time the entry opens: opacity only, 1.6s (DESIGN.md §8).
          Reduced motion collapses the transition through the rule in globals.css. */}
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-0 transition-opacity delay-150 duration-[1600ms] ease-out", entered ? "opacity-100" : "opacity-0")}
        style={{ background: ENTRY_BLOOM[tone] }}
      />
      <TopBar tone={tone} right={<LanguageChip code={language} onClick={onLanguage} tone={tone} />} />
      <Body className="relative pt-[34px]">
        <Kicker className={cn("tracking-[0.12em]", dark && "text-[#9C9EA5]")}>Background check for gig work</Kicker>
        <h1 className="mt-4 mb-3.5 text-[38px] leading-[1.04] font-medium tracking-[-0.03em]">
          Get verified once. <span className={dark ? "text-[#75777E]" : "text-muted-foreground"}>Work anywhere.</span>
        </h1>
        <p className={cn("m-0 text-[15px] leading-[1.55]", dark ? "text-[#B4B6BC]" : "text-secondary-text")}>Three steps, about ten minutes.</p>
        <ol className={cn("mt-7 mb-0 list-none border-t p-0", dark ? "border-[#2E2E33]" : "border-border")}>
          {ENTRY_STEPS.map((step, index) => (
            <NumberedStep key={step.title} index={index + 1} title={step.title} detail={step.detail} tone={tone} />
          ))}
        </ol>
      </Body>
      <Footer className="relative border-t-0 bg-transparent">
        <PrimaryAction onClick={onStart} className={dark ? "bg-white text-foreground hover:bg-white/90" : undefined}>
          Start with mobile number
        </PrimaryAction>
        <TextAction href="/apply?as=organisation" className={cn("justify-center no-underline", dark ? "text-white" : "text-foreground")}>
          I hire workers →
        </TextAction>
      </Footer>
    </Screen>
  );
}

/**
 * R1 / R1b. Returning worker on a device with quick sign-in.
 * R1 shows card status before unlock; R1b keeps it hidden. Product picks one.
 */
export function ReturningScreen({
  worker,
  variant,
  language,
  onUnlock,
  onUseOtp,
  onNotYou,
  onLanguage
}: {
  worker: ReturningWorker;
  variant: "r1" | "r1b";
  language: string;
  onUnlock: () => Promise<void>;
  onUseOtp: () => void;
  onNotYou: () => void;
  onLanguage: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const passed = worker.checks.filter((check) => check.state === "verified").length;
  const live = worker.checks.filter((check) => check.state === "checking").length;
  const locked = variant === "r1b";

  async function unlock() {
    setBusy(true);
    try {
      await onUnlock();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: WELCOME_BLOOM }} />
      <TopBar className="bg-transparent" right={<LanguageChip code={language} onClick={onLanguage} />} />
      <Body className="relative pt-[34px]">
        <Kicker className="tracking-[0.12em]">Welcome back</Kicker>
        <h1 className="mt-2 mb-1.5 text-[30px] leading-[1.1] font-medium tracking-[-0.026em]">{worker.firstName}</h1>
        <p className="tabular m-0 flex items-center gap-1 font-mono text-[12.5px] text-secondary-text">
          {maskPhone(worker.phone)} ·
          <TextAction onClick={onNotYou} className="min-h-0 px-1 py-3 normal-case tracking-normal">Not you?</TextAction>
        </p>

        <BgvCard cardNumber={worker.cardNumber} locked={locked} className="mt-5">
          <div className="flex flex-col gap-2.5 px-3 py-3.5">
            {locked ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-medium">{live === 1 ? "1 check in progress" : `${live} checks in progress`}</span>
                  <StateBadge state="queued" label="Locked" />
                </div>
                <CheckBar states={worker.checks.map(() => "hidden")} />
                <p className="m-0 text-[13px] text-secondary-text">Results and details stay hidden until you unlock.</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="tabular text-[13.5px] font-medium">{passed} of {worker.checks.length} checks passed</span>
                  {live > 0 && <StateBadge state="checking" />}
                </div>
                <CheckBar states={worker.checks.map((check) => check.state)} />
                {worker.liveSummary && <p className="m-0 text-[13px] text-secondary-text">{worker.liveSummary} Unlock to see details.</p>}
              </>
            )}
          </div>
        </BgvCard>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
          <span className="grid size-[84px] place-items-center border border-primary bg-background text-primary outline-[6px] outline-accent outline-solid">
            <Icon icon={Fingerprint} size={40} strokeWidth={1.4} />
          </span>
          <span className="label-mono text-secondary-text">Use your phone’s screen lock</span>
        </div>
      </Body>
      <Footer>
        <PrimaryAction icon={Fingerprint} busy={busy} onClick={unlock}>Unlock</PrimaryAction>
        <SecondaryAction onClick={onUseOtp}>Use OTP instead</SecondaryAction>
      </Footer>
    </Screen>
  );
}
