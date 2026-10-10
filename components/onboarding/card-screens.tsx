"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ChevronRight, Lock, Maximize2, WifiOff } from "lucide-react";
import { StateBadge } from "@/components/state-badge";
import { Button } from "@/components/ui/button";
import {
  CardError,
  cardRows,
  formatCardDate,
  formatCountdown,
  qrPayload,
  useLiveCode,
  useNow,
  useOrigin,
  type CardRow,
  type CardView,
  type IssuedCardView,
  type LiveCodeState,
  type NotIssuedCardView
} from "@/lib/onboarding/card";
import { cn } from "@/lib/utils";
import { CardPhoto, DigitalCard, QrCode, cardBadge, qrOn } from "./digital-card";
import { Body, ErrorBanner, Footer, Icon, Kicker, Lead, NumberedStep, PrimaryAction, Screen, SecondaryAction, Title, TopBar } from "./shell";

/* Shared pieces --------------------------------------------------------------- */

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function split(rows: CardRow[]) {
  return { verified: rows.filter((row) => row.state === "verified"), running: rows.filter((row) => row.state !== "verified") };
}

/** Live code for a card whose QR is on; tells the parent once the session is gone. */
function useCardLiveCode(card: CardView, onSignedOut?: () => void): LiveCodeState {
  const live = useLiveCode(card.issued ? card.live : null, { enabled: qrOn(card) });
  const { signedOut } = live;
  useEffect(() => {
    if (signedOut) onSignedOut?.();
  }, [signedOut, onSignedOut]);
  return live;
}

/** Full-width row that opens another screen. 56px, 1px soft rule, chevron. */
function NavRow({ label, detail, onClick }: { label: string; detail?: string; onClick: () => void }) {
  return (
    <li className="border-b border-line-soft last:border-b-0">
      <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-accent/60">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium">{label}</span>
          {detail && <span className="block text-[13px] text-secondary-text">{detail}</span>}
        </span>
        <Icon icon={ChevronRight} size={16} strokeWidth={2} className="flex-none text-muted-foreground" />
      </button>
    </li>
  );
}

/** Offline is not a check outcome, so it gets no state colour (DESIGN.md §1). */
function OfflineBanner() {
  return (
    <div role="status" className="flex items-start gap-2.5 border border-border bg-paper px-3.5 py-3 text-[13px] leading-[1.5] text-secondary-text">
      <Icon icon={WifiOff} size={14} strokeWidth={2} className="mt-[3px] flex-none" />
      <span>You are offline. The QR is hidden because an old code would not scan.</span>
    </div>
  );
}

/** The pinned blue next step from worker home (DESIGN.md §13), for the card's one main action. */
function NextStepFooter({ kicker, title, detail, label, onClick }: { kicker: string; title: string; detail: string; label: string; onClick: () => void }) {
  return (
    <footer className="flex-none bg-primary px-5 pt-3.5 pb-[max(14px,env(safe-area-inset-bottom))] text-primary-foreground">
      <Kicker className="mb-1.5 tracking-[0.12em] text-primary-foreground">{kicker}</Kicker>
      <h2 className="mt-0 mb-0.5 text-[17px] font-medium tracking-[-0.015em]">{title}</h2>
      <p className="mt-0 mb-3 line-clamp-2 text-[13px] leading-[1.5] text-primary-foreground/85">{detail}</p>
      <Button onClick={onClick} className="h-[52px] w-full justify-between bg-background px-4 text-foreground hover:bg-paper focus-visible:outline-background">
        {label}
        <Icon icon={ArrowRight} size={13} strokeWidth={2.4} />
      </Button>
    </footer>
  );
}

function PrivacyFooter() {
  return (
    <footer className="flex flex-none items-center gap-2 border-t border-border bg-background px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] text-[13px] text-secondary-text">
      <Icon icon={Lock} size={12} strokeWidth={2} />
      Your details are used only for these checks.
    </footer>
  );
}

/* B9 Card so far ----------------------------------------------------------------- */

/**
 * Home while the card is not issued: the preview, then one tile per chosen check. The grid is
 * the centrepiece; tiles turn verified as checks pass. `footer` takes the pinned next step.
 */
export function CardSoFarScreen({
  card,
  topRight,
  notice,
  onBack,
  onSeeChecks,
  footer
}: {
  card: NotIssuedCardView;
  /** Shows a back button in place of the logo. */
  onBack?: () => void;
  /** Header chips, such as language and help. */
  topRight?: ReactNode;
  notice?: string | null;
  onSeeChecks: () => void;
  /** The pinned next step. Without it the footer is the privacy line. */
  footer?: ReactNode;
}) {
  const rows = cardRows(card.checks);
  const verified = rows.filter((row) => row.state === "verified").length;
  return (
    <Screen>
      <TopBar onBack={onBack} right={topRight} />
      <Body className="pt-6">
        <Kicker className="tracking-[0.12em]">Your card so far</Kicker>
        <p className="mt-1.5 mb-4 text-[15px] leading-[1.55] text-secondary-text">Your card is issued when all your checks are done.</p>
        <DigitalCard card={card} />

        {notice && <ErrorBanner>{notice}</ErrorBanner>}

        <div className="mt-6 flex items-baseline justify-between gap-3">
          <Kicker className="tracking-[0.12em]">Your checks</Kicker>
          <span className="tabular font-mono text-[12px] font-medium whitespace-nowrap text-secondary-text">
            <span className="text-state-verified">{verified}</span> / {rows.length} verified
          </span>
        </div>
        {rows.length ? (
          <ul className="mt-2.5 mb-0 grid list-none grid-cols-2 border-t border-l border-border p-0 min-[520px]:grid-cols-3">
            {rows.map((row) => (
              <li key={row.key} className="flex min-h-[88px] flex-col justify-between gap-2.5 border-r border-b border-border p-3">
                <span className="text-[14px] leading-[1.3] font-medium">{row.name}</span>
                <StateBadge state={row.state} className="h-auto whitespace-normal text-left" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2.5 mb-0 text-[14px] text-secondary-text">Choose your checks to see them here.</p>
        )}
        {rows.length > 0 && (
          <button type="button" onClick={onSeeChecks} className="label-mono mt-2 inline-flex min-h-11 items-center gap-1.5 self-start tracking-[0.1em] text-accent-foreground hover:underline">
            See details of all {rows.length}
            <Icon icon={ArrowRight} size={12} strokeWidth={2.4} />
          </button>
        )}
      </Body>
      {footer ?? <PrivacyFooter />}
    </Screen>
  );
}

/* B1 Card home ------------------------------------------------------------------ */

export function CardHomeScreen({
  card,
  topRight,
  notice,
  info,
  footer,
  onShowQr,
  onSeeChecks,
  onAddChecks,
  onReissue,
  onSignedOut
}: {
  card: IssuedCardView;
  topRight?: ReactNode;
  notice?: string | null;
  /** Guidance, not an error. */
  info?: string | null;
  /** Replaces the SHOW LIVE QR footer, e.g. the pinned next step; SHOW LIVE QR then becomes a row. */
  footer?: ReactNode;
  onShowQr: () => void;
  onSeeChecks: () => void;
  onAddChecks: () => void;
  onReissue: () => void;
  onSignedOut?: () => void;
}) {
  const live = useCardLiveCode(card, onSignedOut);
  const { verified } = split(cardRows(card.checks));
  const qr = qrOn(card);
  return (
    <Screen>
      <TopBar right={topRight} />
      <Body className="pt-6">
        <Kicker className="tabular tracking-[0.12em]">Issued {formatCardDate(card.issuedAt)}</Kicker>
        <p className="mt-1.5 mb-4 text-[15px] leading-[1.55] text-secondary-text">Your card is ready. Show it when someone asks for your check.</p>
        <button type="button" onClick={qr ? onShowQr : onSeeChecks} aria-label="Open your card" className="block w-full text-left">
          <DigitalCard card={card} live={live} />
        </button>
        <p className="tabular mt-2.5 mb-0 text-[13px] text-secondary-text">
          {card.scansLastWeek > 0 ? `Checked ${plural(card.scansLastWeek, "time", "times")} in the last 7 days.` : "Nobody checked your card in the last 7 days."}
        </p>

        {live.offline && (
          <div className="mt-4">
            <OfflineBanner />
          </div>
        )}
        {notice && <ErrorBanner>{notice}</ErrorBanner>}
        {info && (
          <p role="status" className="mt-4 mb-0 border border-border bg-background px-3.5 py-3 text-[13px] leading-[1.5] text-secondary-text">
            {info}
          </p>
        )}

        <ul className="mt-5 mb-0 list-none border-t border-border p-0">
          {footer && qr && <NavRow label="Show live QR" onClick={onShowQr} />}
          <NavRow label={verified.length === 1 ? "See your check" : `See all ${verified.length} checks`} onClick={onSeeChecks} />
          <NavRow label="Add more checks to your card" onClick={onAddChecks} />
          <NavRow label="Reissue card" detail="If your card is lost or someone has a photo of it." onClick={onReissue} />
        </ul>
      </Body>
      {footer ?? (qr ? (
        <NextStepFooter
          kicker="Show your card"
          title="Show your live QR"
          detail="The code changes every 2 minutes, so a screenshot stops working."
          label="Show live QR"
          onClick={onShowQr}
        />
      ) : (
        <PrivacyFooter />
      ))}
    </Screen>
  );
}

/* B2 Card screen ------------------------------------------------------------------ */

function CardNumberBlock({ cardNumber }: { cardNumber: string }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <Kicker className="tracking-[0.12em]">Card number</Kicker>
      <p className="tabular mt-1.5 mb-0 font-mono text-[18px] font-medium tracking-[0.04em] break-all">{cardNumber}</p>
      <p className="mt-1.5 mb-0 text-[13px] leading-[1.5] text-secondary-text">
        Read this out if their camera does not work.
      </p>
    </div>
  );
}

export function CardScreen({
  card,
  onBack,
  onBigQr,
  onSeeChecks,
  onSignedOut
}: {
  card: IssuedCardView;
  onBack: () => void;
  onBigQr: () => void;
  onSeeChecks: () => void;
  onSignedOut?: () => void;
}) {
  const live = useCardLiveCode(card, onSignedOut);
  const { verified } = split(cardRows(card.checks));
  const qr = qrOn(card);
  const seeChecks = verified.length === 1 ? "See your check" : `See all ${verified.length} checks`;
  return (
    <Screen>
      <TopBar onBack={onBack} step="Your card" />
      <Body className="pt-5">
        {live.offline && (
          <div className="mb-4">
            <OfflineBanner />
          </div>
        )}
        <DigitalCard card={card} size="large" live={live} />
        {qr ? (
          <p className="mt-4 mb-0 text-[14px] leading-[1.55] text-secondary-text">The QR changes every 2 minutes, so a screenshot stops working. Show this screen, not a photo of it.</p>
        ) : (
          <p className="mt-4 mb-0 text-[14px] leading-[1.55] text-secondary-text">
            {card.status === "expired" ? "Your card has expired, so its QR is off. Renew your checks to turn it back on." : "Your card is on hold, so its QR is off."}
          </p>
        )}
        <CardNumberBlock cardNumber={card.cardNumber} />
      </Body>
      <Footer>
        {live.offline ? (
          <PrimaryAction onClick={live.refresh}>Try again</PrimaryAction>
        ) : qr ? (
          <PrimaryAction onClick={onBigQr} icon={Maximize2}>
            Make QR bigger
          </PrimaryAction>
        ) : null}
        <SecondaryAction onClick={onSeeChecks}>{seeChecks}</SecondaryAction>
      </Footer>
    </Screen>
  );
}

/* B3 Large QR --------------------------------------------------------------------- */

export function LargeQrScreen({ card, onDone, onSignedOut }: { card: IssuedCardView; onDone: () => void; onSignedOut?: () => void }) {
  const live = useCardLiveCode(card, onSignedOut);
  const origin = useOrigin();
  const now = useNow(60_000);
  const badge = cardBadge(card, now);
  const qr = qrOn(card);
  return (
    <Screen>
      <TopBar onBack={onDone} step="Show to verifier" />
      <Body className="items-center pt-5 text-center">
        <div className="flex w-full items-center gap-3 text-left">
          <CardPhoto hasPhoto={card.hasPhoto} version={card.issuedAt} className="w-12" />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[17px] leading-[1.2] font-medium tracking-[-0.012em] break-words">{card.name || "Your name"}</p>
            <p className="mt-0.5 mb-1.5 text-[12.5px] text-secondary-text">Background verified</p>
            <StateBadge state={badge.state} label={badge.label} />
          </div>
        </div>

        <div className="mt-5 grid aspect-square w-full max-w-[260px] place-items-center">
          {!qr ? (
            <div className="grid size-full place-items-center border border-border bg-paper p-6 text-secondary-text">
              <span>
                <span className="label-mono block">QR off</span>
                <span className="mt-1 block text-[13px]">{card.status === "expired" ? "Renew to turn it back on" : "Your card is on hold"}</span>
              </span>
            </div>
          ) : live.offline ? (
            <div className="grid size-full place-items-center border border-border bg-paper p-6 text-secondary-text">
              <span className="flex flex-col items-center gap-2">
                <Icon icon={WifiOff} size={24} strokeWidth={1.7} />
                <span className="label-mono">QR hidden</span>
                <span className="text-[13px]">You are offline. An old code would not scan.</span>
              </span>
            </div>
          ) : live.token && origin ? (
            <QrCode value={qrPayload(live.token, origin)} size={260} quietZone={4} className="size-full" />
          ) : (
            <div className="grid size-full place-items-center border border-border bg-paper text-secondary-text">
              <span className="label-mono">Getting code</span>
            </div>
          )}
        </div>

        {qr && !live.offline && (
          <>
            <Kicker className="mt-4 tracking-[0.12em]">New code in</Kicker>
            <p className="tabular mt-1 mb-0 font-mono text-[26px] font-medium">{live.token ? formatCountdown(live.secondsLeft) : "0:00"}</p>
            <span className="mt-2 block h-0.5 w-full max-w-[260px] bg-track">
              <span className="block h-0.5 bg-primary" style={{ width: `${live.fraction * 100}%` }} />
            </span>
          </>
        )}

        <p className="tabular mt-5 mb-0 font-mono text-[14px] font-medium tracking-[0.04em] break-all">
          <span className="sr-only">Card number </span>
          {card.cardNumber}
        </p>
        <p className="mt-3 mb-0 text-[13px] leading-[1.5] text-secondary-text">Turn your screen brightness up so the code scans easily.</p>
      </Body>
      <Footer>
        {live.offline && <PrimaryAction onClick={live.refresh}>Try again</PrimaryAction>}
        <SecondaryAction onClick={onDone}>Done</SecondaryAction>
      </Footer>
    </Screen>
  );
}

/* B4 All checks ------------------------------------------------------------------- */

export function CardChecksScreen({ card, onBack, onAddChecks }: { card: CardView; onBack: () => void; onAddChecks: () => void }) {
  const { verified, running } = split(cardRows(card.checks));
  return (
    <Screen>
      <TopBar onBack={onBack} step="Card · checks" />
      <Body className="pt-6">
        <Title>{verified.length ? `${plural(verified.length, "check", "checks")} on your card` : "No checks on your card yet"}</Title>
        <Lead>{verified.length ? "These are the checks that passed." : "A check is added to your card when it passes."}</Lead>

        {verified.length > 0 && (
          <ul className="mt-5 mb-0 list-none border-t border-border p-0">
            {verified.map((row) => (
              <li key={row.key} className="flex min-h-14 items-center gap-2.5 border-b border-line-soft py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium">{row.name}</span>
                  <span className="tabular block font-mono text-[11px] tracking-[0.06em] text-secondary-text uppercase">
                    {row.source}
                    {row.completedAt && ` · ${formatCardDate(row.completedAt)}`}
                  </span>
                </span>
                <StateBadge state="verified" className="shrink-0" />
              </li>
            ))}
          </ul>
        )}

        {running.length > 0 && (
          <>
            <Kicker className="mt-6 tracking-[0.12em]">Still running</Kicker>
            <ul className="mt-2 mb-0 list-none border-t border-border p-0">
              {running.map((row) => (
                <li key={row.key} className="flex min-h-14 items-center gap-2.5 border-b border-line-soft py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-medium">{row.name}</span>
                    <span className="block font-mono text-[11px] tracking-[0.06em] text-secondary-text uppercase">{row.source}</span>
                  </span>
                  <StateBadge state={row.state} className="shrink-0" />
                </li>
              ))}
            </ul>
          </>
        )}
      </Body>
      <Footer>
        <SecondaryAction onClick={onAddChecks}>Add more checks</SecondaryAction>
      </Footer>
    </Screen>
  );
}

/* Reissue ------------------------------------------------------------------------- */

export function ReissueScreen({ card, onConfirm, onBack }: { card?: IssuedCardView; onConfirm: () => Promise<void>; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (cause) {
      setError(cause instanceof CardError || cause instanceof Error ? cause.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TopBar onBack={onBack} step="Reissue card" />
      <Body>
        <Title>Reissue your card</Title>
        <Lead>Your current card&apos;s QR stops working at once. Use this if your card is lost or someone has a photo of it.</Lead>
        <Kicker className="mt-6 tracking-[0.12em]">What happens</Kicker>
        <ol className="mt-1 mb-0 list-none p-0">
          <NumberedStep
            index={1}
            title={card ? `Card ${card.cardNumber} is cancelled` : "Your current card is cancelled"}
            detail="Anyone who scans it sees that it is not valid."
          />
          <NumberedStep index={2} title="You get a new card number" detail="Right away. Your checks carry over." />
        </ol>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </Body>
      <Footer>
        <PrimaryAction onClick={confirm} busy={busy} arrow={false}>
          Cancel old card and reissue
        </PrimaryAction>
        <SecondaryAction onClick={onBack} className={cn(busy && "pointer-events-none opacity-60")}>
          Keep my card
        </SecondaryAction>
      </Footer>
    </Screen>
  );
}
