"use client";

import { useState } from "react";
import { ArrowRight, Bike, Car, Clock, Factory, House, Lock, Shield, type LucideIcon } from "lucide-react";
import { StateBadge } from "@/components/state-badge";
import { Button } from "@/components/ui/button";
import {
  CHECK_NAMES,
  CHECK_TIMING,
  CONSENT_TEXT_VERSION,
  CONSENTS,
  formatInr,
  HELP_URL,
  PACKAGES,
  WORK_TYPES,
  type WorkTypeId
} from "@/lib/onboarding/data";
import type { ConsentRecord, WorkerProfile } from "@/lib/onboarding/service";
import { ONBOARDING_TEST_MODE } from "@/lib/onboarding/test-mode";
import { cn } from "@/lib/utils";
import { CheckBar } from "./bgv-card";
import {
  Body,
  CheckRow,
  ChoiceRow,
  ErrorBanner,
  Footer,
  HeaderChip,
  Icon,
  Kicker,
  LanguageChip,
  Lead,
  NumberedStep,
  PrimaryAction,
  RadioMark,
  Screen,
  StageProgress,
  TextAction,
  Title,
  TopBar
} from "./shell";

const WORK_ICONS: Record<WorkTypeId, LucideIcon> = {
  delivery: Bike,
  driver: Car,
  home: House,
  security: Shield,
  warehouse: Factory,
  temporary: Clock
};

/* 06 Worker home ----------------------------------------------------------- */

type NextStep = { title: string; detail: string; href?: string; onStart?: () => void };

export function HomeScreen({
  worker,
  language,
  workType,
  consentDone,
  onLanguage,
  onChooseWork,
  onConsent
}: {
  worker: WorkerProfile;
  language: string;
  workType?: WorkTypeId;
  consentDone: boolean;
  onLanguage: () => void;
  onChooseWork: () => void;
  onConsent: () => void;
}) {
  const work = WORK_TYPES.find((item) => item.id === workType);
  const pack = work ? PACKAGES[work.packageCode] : undefined;
  const total = pack?.checks.length;

  const next: NextStep = !work
    ? { title: "Choose the work you do", detail: "This decides which checks you need and the price. About 1 minute.", onStart: onChooseWork }
    : !consentDone
      ? { title: "Approve your checks", detail: "Say yes to each check before it runs. About 1 minute.", onStart: onConsent }
      : { title: "Share your details", detail: "DigiLocker first, typing only if needed.", href: "/apply?as=worker" };

  const stepIndex = !work ? 0 : !consentDone ? 0 : 1;

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
      {/* Body on --paper; the greeting block and next-step card stay white (DESIGN.md §13). */}
      <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-paper">
        <div className="border-b border-border bg-background px-5 pt-6 pb-[22px]">
          <Kicker className="tracking-[0.12em]">Namaste</Kicker>
          <Title className="mt-1.5 mb-3.5">{worker.fullName}</Title>
          {/* Card label with the verified count in a pill, 10px after it (DESIGN.md §13, 06). */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[14px] font-medium">Liwip BGV Card</span>
            <StateBadge state="verified" label="1 verified" className="tabular" />
          </div>
          {total ? (
            <CheckBar className="mt-2.5" states={pack.checks.map((check) => (check === "mobile" ? "verified" : "queued"))} />
          ) : (
            <p className="mt-1.5 mb-0 text-[13px] text-secondary-text">Your checks appear here once you choose your work.</p>
          )}
        </div>

        <section className="px-5 pt-5">
          <Kicker className="mb-2.5 tracking-[0.12em]">Your next step</Kicker>
          <div className="border border-foreground bg-background">
            <div className="px-4 pt-4 pb-3.5">
              <div className="flex items-center justify-between">
                <span className="tabular font-mono text-[11px] text-muted-foreground">{worker.applicationId}</span>
                <StateBadge state="queued" label="In progress" />
              </div>
              <h2 className="mt-3 mb-1 text-[19px] font-medium tracking-[-0.015em]">{next.title}</h2>
              <p className="m-0 text-[13.5px] leading-[1.55] text-secondary-text">{next.detail}</p>
            </div>
            {next.href ? (
              <a href={next.href} className="label-mono flex h-[50px] items-center justify-between bg-primary px-4 text-[11.5px] text-primary-foreground hover:bg-accent-foreground">
                Start <Icon icon={ArrowRight} size={13} strokeWidth={2.4} />
              </a>
            ) : (
              <Button onClick={next.onStart} className="h-[50px] w-full justify-between px-4">
                Start <Icon icon={ArrowRight} size={13} strokeWidth={2.4} />
              </Button>
            )}
          </div>
        </section>

        <section className="px-5 pt-[22px] pb-6">
          <Kicker className="mb-1.5 tracking-[0.12em]">How it works</Kicker>
          <ol className="m-0 list-none p-0">
            <NumberedStep index={1} title="Choose work" detail="We pick the right checks" active={stepIndex === 0} />
            <NumberedStep index={2} title="Share details" detail="DigiLocker first, typing only if needed" active={stepIndex === 1} />
            <NumberedStep index={3} title="Track every check" detail="Live status, SMS when it changes" active={false} />
          </ol>
        </section>
      </main>
      <footer className="flex flex-none items-center gap-2 border-t border-border bg-background px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] text-[13px] text-secondary-text">
        <Icon icon={Lock} size={12} strokeWidth={2} />
        Documents are stored privately. Links expire.
      </footer>
    </Screen>
  );
}

/* 07 Choose work ----------------------------------------------------------- */

export function ChooseWorkScreen({
  value,
  language,
  onBack,
  onLanguage,
  onContinue
}: {
  value?: WorkTypeId;
  language: string;
  onBack: () => void;
  onLanguage: () => void;
  onContinue: (id: WorkTypeId) => void;
}) {
  const [selected, setSelected] = useState<WorkTypeId | undefined>(value);
  // Test mode continues as the first work type when nothing is picked.
  const work = WORK_TYPES.find((item) => item.id === selected) ?? (ONBOARDING_TEST_MODE ? WORK_TYPES[0] : undefined);

  return (
    <Screen>
      <TopBar onBack={onBack} step="Your work · 1 of 3" right={<LanguageChip code={language} onClick={onLanguage} />} />
      <StageProgress stage={1} />
      <Body className="pt-6">
        <Title>What work do you do?</Title>
        <Lead className="mt-2 mb-[18px] text-[14.5px]">Pick the one you do most. It decides your checks.</Lead>
        <fieldset className="m-0 border-0 border-t border-border p-0">
          <legend className="sr-only">Work type</legend>
          {WORK_TYPES.map((item) => {
            const checked = selected === item.id;
            return (
              <ChoiceRow
                key={item.id}
                name="work"
                value={item.id}
                checked={checked}
                onSelect={(id) => setSelected(id as WorkTypeId)}
                className="min-h-[62px] gap-[13px] last:border-b-0"
                leading={<Icon icon={WORK_ICONS[item.id]} size={20} strokeWidth={1.6} className={cn("flex-none", checked ? "text-accent-foreground" : "text-secondary-text")} />}
                trailing={<RadioMark checked={checked} />}
              >
                <span className="block text-[15.5px] font-medium">{item.title}</span>
                <span className="block text-[13px] text-secondary-text">{item.detail}</span>
              </ChoiceRow>
            );
          })}
        </fieldset>
      </Body>
      <Footer>
        <PrimaryAction blockedBy={work ? undefined : "Pick one to continue"} onClick={() => work && onContinue(work.id)}>
          Continue as {work?.short}
        </PrimaryAction>
      </Footer>
    </Screen>
  );
}

/* 08 Review package ------------------------------------------------------- */

export function PackageScreen({
  workType,
  language,
  onBack,
  onLanguage,
  onOtherPackages,
  onChoose
}: {
  workType: WorkTypeId;
  language: string;
  onBack: () => void;
  onLanguage: () => void;
  onOtherPackages: () => void;
  onChoose: () => void;
}) {
  const work = WORK_TYPES.find((item) => item.id === workType) ?? WORK_TYPES[0];
  const pack = PACKAGES[work.packageCode];

  return (
    <Screen>
      <TopBar onBack={onBack} step="Your work · 2 of 3" right={<LanguageChip code={language} onClick={onLanguage} />} />
      <StageProgress stage={1} />
      <Body className="pt-6">
        <Title>Your {work.short} checks</Title>
        <Lead className="mt-2 mb-[18px] text-[14.5px]">These {pack.checks.length} checks are what {work.platforms} ask for.</Lead>
        <div className="border border-foreground">
          <div className="flex items-end justify-between border-b border-border px-3.5 pt-3.5 pb-3">
            <div>
              <Kicker>{pack.name} package</Kicker>
              <p className="mt-[3px] mb-0 text-[13px] text-secondary-text">Valid {pack.validityMonths} months · reusable</p>
            </div>
            <span className="tabular font-mono text-[26px] font-medium tracking-[-0.01em]">{formatInr(pack.priceInr)}</span>
          </div>
          <ul className="m-0 list-none px-3.5 pt-0.5 pb-1">
            {pack.checks.map((check) => (
              <li key={check} className="flex items-center justify-between gap-3 border-b border-line-soft py-2 text-[13px] last:border-b-0">
                <span>{CHECK_NAMES[check]}</span>
                {check === "mobile" ? (
                  <StateBadge state="verified" label="Done" />
                ) : (
                  <span className="tabular font-mono text-[11px] text-muted-foreground">{CHECK_TIMING[check]}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <TextAction onClick={onOtherPackages}>See other packages</TextAction>
          <span className="text-[13px] text-secondary-text">Pay after review</span>
        </div>
      </Body>
      <Footer>
        <PrimaryAction onClick={onChoose}>Choose {work.short} · {formatInr(pack.priceInr)}</PrimaryAction>
      </Footer>
    </Screen>
  );
}

/* 09 Consent --------------------------------------------------------------- */

export function ConsentScreen({
  language,
  onBack,
  onLanguage,
  onAgree
}: {
  language: string;
  onBack: () => void;
  onLanguage: () => void;
  onAgree: (records: ConsentRecord[]) => Promise<void>;
}) {
  // Nothing is pre-ticked and there is no "agree to all" (DESIGN.md §13).
  const [approved, setApproved] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const left = CONSENTS.filter((item) => !approved[item.id]).length;

  function toggle(id: string, checked: boolean) {
    setApproved((current) => {
      const nextState = { ...current };
      if (checked) nextState[id] = new Date().toISOString();
      else delete nextState[id];
      return nextState;
    });
  }

  async function agree() {
    setBusy(true);
    setFailed(false);
    try {
      // Test mode only: unticked rows are stamped so the mock flow can continue.
      const now = new Date().toISOString();
      await onAgree(CONSENTS.map((item) => ({ id: item.id, textVersion: CONSENT_TEXT_VERSION, approvedAt: approved[item.id] ?? now })));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TopBar onBack={onBack} step="Your work · 3 of 3" right={<LanguageChip code={language} onClick={onLanguage} />} />
      <StageProgress stage={1} />
      <Body className="pt-6">
        <Title>Approve each check</Title>
        <Lead className="mt-2 mb-[18px] text-[14.5px]">We record what you approve, why, and when. You can withdraw later.</Lead>
        <fieldset className="m-0 border-0 border-t border-border p-0">
          <legend className="sr-only">Checks to approve</legend>
          {CONSENTS.map((item) => (
            <CheckRow key={item.id} checked={Boolean(approved[item.id])} onToggle={(checked) => toggle(item.id, checked)} title={item.title} detail={item.detail} />
          ))}
        </fieldset>
        {failed && <ErrorBanner>Your approvals were not saved. Check your connection and try again.</ErrorBanner>}
        <TextAction href="/privacy" className="mt-2 self-start">Read full privacy notice</TextAction>
      </Body>
      <Footer>
        <PrimaryAction busy={busy} blockedBy={left > 0 ? `Agree · ${left} left to approve` : undefined} onClick={agree}>
          Agree
        </PrimaryAction>
      </Footer>
    </Screen>
  );
}
