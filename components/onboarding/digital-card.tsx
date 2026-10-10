"use client";

import { useMemo, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { Lock, UserRound, WifiOff } from "lucide-react";
import { StateBadge, type VerificationState } from "@/components/state-badge";
import {
  cardPhotoUrl,
  cardRows,
  daysUntil,
  formatCardDate,
  formatCountdown,
  qrPayload,
  useNow,
  useOrigin,
  type CardView,
  type IssuedCardView,
  type LiveCodeState
} from "@/lib/onboarding/card";
import { cn } from "@/lib/utils";
import { Icon } from "./shell";

/* QR ------------------------------------------------------------------------ */

/**
 * Pure black on white, error correction M, nothing over it (CARD-DESIGN-SPEC §3.6).
 * Drawn as one SVG path so it stays sharp at any size.
 */
export function QrCode({ value, size, quietZone = 2, className }: { value: string; size: number; quietZone?: number; className?: string }) {
  const { path, extent } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    let d = "";
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.data[row * modules.size + col]) d += `M${col + quietZone} ${row + quietZone}h1v1h-1z`;
      }
    }
    return { path: d, extent: modules.size + quietZone * 2 };
  }, [value, quietZone]);
  return (
    <svg
      role="img"
      aria-label="QR code for verifiers"
      width={size}
      height={size}
      viewBox={`0 0 ${extent} ${extent}`}
      shapeRendering="crispEdges"
      className={cn("block bg-white", className)}
    >
      <path d={path} fill="#0B0B0C" />
    </svg>
  );
}

/* Photo --------------------------------------------------------------------- */

/** 3:4 portrait in a 1px frame; a grey box with a person icon when there is none or it fails. */
export function CardPhoto({ hasPhoto, version, className }: { hasPhoto: boolean; version: string | number; className?: string }) {
  const [failedFor, setFailedFor] = useState<string | number | null>(null);
  const showPhoto = hasPhoto && failedFor !== version;
  return (
    <div className={cn("relative aspect-[3/4] flex-none overflow-hidden border border-border bg-[#F3F3F5]", className)}>
      {showPhoto ? (
        // A same-origin route that streams bytes; next/image would add nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cardPhotoUrl(version)} alt="Your photo" className="size-full object-cover" onError={() => setFailedFor(version)} />
      ) : (
        <span className="grid size-full place-items-center text-[#9C9EA5]">
          <Icon icon={UserRound} size={26} strokeWidth={1.5} />
          <span className="sr-only">No photo</span>
        </span>
      )}
    </div>
  );
}

/* Status -------------------------------------------------------------------- */

export function cardBadge(card: IssuedCardView, now: number): { state: VerificationState; label: string } {
  switch (card.status) {
    case "valid":
      return { state: "verified", label: "Valid" };
    case "expiring": {
      const days = daysUntil(card.expiresAt, now);
      return { state: "review", label: days <= 0 ? "Expires today" : days === 1 ? "Expires in 1 day" : `Expires in ${days} days` };
    }
    case "updating":
      return { state: "review", label: "Updating" };
    case "expired":
      return { state: "fix", label: "Expired" };
    case "suspended":
      return { state: "fix", label: "Suspended" };
  }
}

/** Whether the live QR is on for this card. Expired and suspended cards have it switched off. */
export function qrOn(card: CardView) {
  return card.issued && card.status !== "expired" && card.status !== "suspended";
}

/* QR area ------------------------------------------------------------------- */

type LiveProps = Pick<LiveCodeState, "token" | "secondsLeft" | "fraction" | "offline">;

function QrBox({ size, dashed, children }: { size: number; dashed?: boolean; children: ReactNode }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 p-1.5 text-center text-secondary-text",
        dashed ? "border border-dashed border-[#9C9EA5]" : "border border-border bg-paper"
      )}
    >
      {children}
    </div>
  );
}

function QrArea({ card, live, offline, qrSize, large }: { card: CardView; live?: LiveProps; offline: boolean; qrSize: number; large: boolean }) {
  const origin = useOrigin();
  const width = large ? undefined : qrSize;

  let content: ReactNode;
  if (!card.issued) {
    content = (
      <QrBox size={qrSize} dashed>
        <span className="label-mono leading-[1.5]">No QR until issued</span>
      </QrBox>
    );
  } else if (card.status === "expired" || card.status === "suspended") {
    content = (
      <QrBox size={qrSize}>
        <span className="label-mono">QR off</span>
        <span className="text-[11.5px] leading-[1.3]">{card.status === "expired" ? "Renew to turn it back on" : "Your card is on hold"}</span>
      </QrBox>
    );
  } else if (offline || live?.offline) {
    // An old code would not scan, so no stale QR is ever shown (CARD-DESIGN-SPEC B10).
    content = (
      <QrBox size={qrSize}>
        <Icon icon={WifiOff} size={20} strokeWidth={1.7} />
        <span className="label-mono">QR hidden</span>
      </QrBox>
    );
  } else if (!live?.token || !origin) {
    content = (
      <QrBox size={qrSize}>
        <span className="label-mono leading-[1.5]">Getting code</span>
      </QrBox>
    );
  } else {
    const bar = (
      <span
        role="progressbar"
        aria-label="Time until the QR changes"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(live.fraction * 100)}
        className={cn("block h-0.5 bg-track", !large && "min-w-0 flex-1")}
        style={large ? { width: qrSize } : undefined}
      >
        <span className="block h-0.5 bg-primary" style={{ width: `${live.fraction * 100}%` }} />
      </span>
    );
    return (
      <div className="flex flex-none flex-col items-center" style={{ width }}>
        <QrCode value={qrPayload(live.token, origin)} size={qrSize} quietZone={large ? 4 : 2} />
        {large ? (
          <>
            <span className="tabular mt-2.5 font-mono text-[12px] font-medium tracking-[0.11em] whitespace-nowrap uppercase">New code {formatCountdown(live.secondsLeft)}</span>
            <span className="mt-1.5">{bar}</span>
          </>
        ) : (
          // Compact: the timer line and the time share one row, exactly as wide as the QR.
          <span className="mt-2 flex w-full items-center gap-1.5" title="New code in">
            {bar}
            <span className="tabular flex-none font-mono text-[10.5px] leading-none font-medium tracking-[0.04em]">
              <span className="sr-only">New code in </span>
              {formatCountdown(live.secondsLeft)}
            </span>
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-none flex-col items-center" style={{ width }}>
      {content}
    </div>
  );
}

/* Card ---------------------------------------------------------------------- */

const WATERMARK = Array.from({ length: 9 }, () => "NOT ISSUED · PREVIEW · NOT ISSUED · PREVIEW · NOT ISSUED · PREVIEW · NOT ISSUED");

/**
 * The digital Liwip BGV Card (CARD-DESIGN-SPEC B8). `compact` is the 342 × 216 front:
 * photo, name and status in a row with a ~72px QR on the right. `large` stacks the QR under
 * the holder so it can be scanned from the card screen. A card that is not issued yet is a
 * dashed preview with a NOT ISSUED watermark, no QR and no card number, so a screenshot of it
 * can never pass for a real card.
 */
export function DigitalCard({
  card,
  size = "compact",
  live,
  offline = false,
  photoVersion,
  className
}: {
  card: CardView;
  size?: "compact" | "large";
  /** From useLiveCode. Without it an issued card shows "Getting code" in place of the QR. */
  live?: LiveProps;
  /** Hide the QR, for example when the card view itself came from a cache. */
  offline?: boolean;
  /** Changes the photo URL so a new photo is fetched; defaults to the issue date. */
  photoVersion?: string | number;
  className?: string;
}) {
  const now = useNow(60_000);
  const large = size === "large";
  const preview = !card.issued;
  const badge = card.issued ? cardBadge(card, now) : null;
  const name = card.name || "Your name";
  const version = photoVersion ?? (card.issued ? card.issuedAt : "preview");

  // Counted by row, so the selfie's two checks count once, as they are shown.
  const rows = cardRows(card.checks);
  const verified = rows.filter((row) => row.state === "verified").length;
  const footLeft = card.issued
    ? verified < rows.length
      ? `${verified} of ${rows.length} verified`
      : `${verified} ${verified === 1 ? "check" : "checks"} verified`
    : "Not valid for checks";
  const footRight = card.issued ? (card.status === "expired" ? `Expired ${formatCardDate(card.expiresAt)}` : `Valid to ${formatCardDate(card.expiresAt)}`) : "No card number yet";
  const footTone = card.issued && card.status === "expired" ? "text-state-fix" : card.issued && card.status === "expiring" ? "text-state-review" : undefined;

  const holder = (
    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
      <div className="min-w-0">
        <p className={cn("-mt-[3px] mb-0 font-medium tracking-[-0.012em] break-words", large ? "text-[19px] leading-[1.2]" : "text-[17px] leading-[1.2]", !card.name && "text-secondary-text")}>{name}</p>
        <p className="mt-1 mb-0 text-[12.5px] leading-[1.35] text-secondary-text">{preview ? "Background check in progress" : "Background verified"}</p>
      </div>
      <div className="flex">
        {badge ? (
          <StateBadge state={badge.state} label={badge.label} className="h-auto whitespace-normal text-left" />
        ) : (
          <StateBadge state="queued" label={`${verified} of ${rows.length} checks done`} className="tabular h-auto whitespace-normal text-left" />
        )}
      </div>
    </div>
  );

  return (
    <section
      aria-label={preview ? "Liwip BGV Card preview, not issued" : "Liwip BGV Card"}
      className={cn("relative flex w-full flex-none flex-col overflow-hidden bg-background", preview ? "border border-dashed border-muted-foreground" : "border border-foreground", className)}
    >
      {preview ? (
        <div className="flex h-8 flex-none items-center justify-between border-b border-border bg-[#F3F3F5] px-3.5 text-secondary-text">
          <span className="flex items-center gap-2">
            <Icon icon={Lock} size={11} strokeWidth={2.4} />
            <span className="label-mono tracking-[0.12em]">Card preview</span>
          </span>
          <span className="label-mono">Not issued</span>
        </div>
      ) : (
        <div className="flex h-8 flex-none items-center justify-between gap-3 bg-foreground px-3.5 text-white">
          <span className="flex flex-none items-center gap-2">
            <span aria-hidden="true" className="size-[9px] bg-primary" />
            <span className="label-mono tracking-[0.12em]">Liwip BGV Card</span>
          </span>
          <span className="tabular min-w-0 truncate font-mono text-[11px] font-medium tracking-[0.06em] text-[#C9CBD1]">
            <span className="sr-only">Card number </span>
            {card.issued && card.cardNumber}
          </span>
        </div>
      )}

      {large ? (
        <>
          <div className="flex gap-3.5 p-3.5">
            <CardPhoto hasPhoto={card.hasPhoto} version={version} className="w-[72px]" />
            {holder}
          </div>
          <div className="flex justify-center border-t border-line-soft px-3.5 pt-5 pb-4">
            <QrArea card={card} live={live} offline={offline} qrSize={176} large />
          </div>
        </>
      ) : (
        // Photo (68 × 91) and QR block (70 + timer row) are the same height, so the row reads as one band.
        <div className="flex items-stretch gap-3 p-3.5">
          <CardPhoto hasPhoto={card.hasPhoto} version={version} className="w-[68px] self-start" />
          {holder}
          <QrArea card={card} live={live} offline={offline} qrSize={70} large={false} />
        </div>
      )}

      <div className="tabular mt-auto flex min-h-[32px] flex-none items-center justify-between gap-3 border-t border-line-soft px-3.5 py-1.5 font-mono text-[11px] font-medium tracking-[0.06em] uppercase">
        <span>{footLeft}</span>
        <span className={cn("text-right", footTone)}>{footRight}</span>
      </div>

      {preview && (
        <div aria-hidden="true" className="pointer-events-none absolute -inset-10 flex -rotate-[14deg] flex-col justify-center gap-[22px] overflow-hidden">
          {WATERMARK.map((row, index) => (
            <span key={index} className="font-mono text-[11px] font-medium tracking-[0.16em] whitespace-nowrap text-foreground/[0.09]">
              {row}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
