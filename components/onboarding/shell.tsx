"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, type LucideIcon, type LucideProps } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STAGES } from "@/lib/onboarding/data";
import { ONBOARDING_TEST_MODE } from "@/lib/onboarding/test-mode";

/** Lucide with the square caps and mitred joins of the zero-radius language (DESIGN.md §9). */
export function Icon({ icon: Glyph, ...props }: { icon: LucideIcon } & LucideProps) {
  return <Glyph aria-hidden="true" strokeLinecap="square" strokeLinejoin="miter" {...props} />;
}

/** One mobile column. On wider screens it sits in a sheet with 1px side rules. */
export function Screen({ children, className, tone = "light" }: { children: ReactNode; className?: string; tone?: "light" | "dark" }) {
  return (
    <div className={cn("min-h-dvh", tone === "dark" ? "bg-foreground" : "bg-background")}>
      {ONBOARDING_TEST_MODE && (
        <span className="label-mono pointer-events-none fixed right-0 bottom-0 z-50 border-t border-l border-state-review-border bg-state-review-bg px-2 py-px text-state-review">
          Test mode
        </span>
      )}
      <div
        className={cn(
          "relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden min-[481px]:border-x",
          tone === "dark" ? "border-[#26262A] text-white" : "border-border",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function Logo({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <span className={cn("inline-flex items-center gap-[9px]", tone === "dark" && "text-white")}>
      <span aria-hidden="true" className="size-[13px] bg-primary" />
      <span className="font-mono text-[12px] font-medium tracking-[0.14em]">LIWIP</span>
    </span>
  );
}

/** 32px chip inside a 44px hit area (DESIGN.md §11 floor). */
export function LanguageChip({ code, onClick, tone = "light" }: { code: string; onClick: () => void; tone?: "light" | "dark" }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Language: ${code}. Change language`} className="grid h-11 min-w-11 place-items-center">
      <span
        className={cn(
          "label-mono flex h-8 items-center border px-2.5 tracking-[0.1em]",
          tone === "dark" ? "border-[#3A3A3E] text-white" : "border-border bg-background text-foreground"
        )}
      >
        {code.toUpperCase()}
      </span>
    </button>
  );
}

export function TopBar({
  onBack,
  step,
  right,
  tone = "light"
}: {
  onBack?: () => void;
  step?: string;
  right?: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <header
      className={cn(
        "relative flex h-[52px] flex-none items-center justify-between border-b",
        onBack ? "pr-2 pl-2" : "pr-2 pl-5",
        tone === "dark" ? "border-[#26262A]" : "border-border bg-background"
      )}
    >
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Back" className="grid size-11 place-items-center">
          <Icon icon={ArrowLeft} size={18} strokeWidth={2} />
        </button>
      ) : (
        <Logo tone={tone} />
      )}
      {step && <span className="label-mono absolute left-1/2 -translate-x-1/2 text-muted-foreground">{step}</span>}
      <div className="flex items-center">{right}</div>
    </header>
  );
}

type SegmentState = "done" | "current" | "ahead";

/** Five 3px stage segments. `complete` marks the current stage as done. */
export function StageProgress({ stage, complete = false }: { stage: number; complete?: boolean }) {
  const states: SegmentState[] = STAGES.map((_, index) =>
    index < stage ? "done" : index === stage ? (complete ? "done" : "current") : "ahead"
  );
  return (
    <div role="img" aria-label={`Stage ${stage + 1} of ${STAGES.length}: ${STAGES[stage]}${complete ? ", done" : ""}`} className="mt-3 flex flex-none gap-[3px] px-5">
      {states.map((state, index) => (
        <span
          key={STAGES[index]}
          className={cn("h-[3px] flex-1", state === "done" ? "bg-state-verified" : state === "current" ? "bg-primary" : "bg-track")}
        />
      ))}
    </div>
  );
}

export function Body({ children, className }: { children: ReactNode; className?: string }) {
  return <main id="main" className={cn("flex flex-1 flex-col px-5 pt-7 pb-6", className)}>{children}</main>;
}

export function Title({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn("m-0 text-[28px] leading-[1.12] font-medium tracking-[-0.024em]", className)}>{children}</h1>;
}

export function Lead({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-2.5 mb-0 text-[15px] leading-[1.55] text-muted-foreground", className)}>{children}</p>;
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("label-mono m-0 text-muted-foreground", className)}>{children}</p>;
}

export function Footer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer
      className={cn(
        "sticky bottom-0 z-10 flex flex-none flex-col gap-2.5 border-t border-border bg-background px-5 pt-4 pb-[max(22px,env(safe-area-inset-bottom))]",
        className
      )}
    >
      {children}
    </footer>
  );
}

/**
 * 52px primary. When `blockedBy` is set the button is disabled and its label says
 * what is missing; it is never a silent grey button (DESIGN.md §13).
 */
export function PrimaryAction({
  children,
  onClick,
  blockedBy,
  busy = false,
  icon,
  arrow = true,
  className
}: {
  children: ReactNode;
  onClick?: () => void;
  blockedBy?: string;
  busy?: boolean;
  icon?: LucideIcon;
  arrow?: boolean;
  className?: string;
}) {
  // In test mode nothing blocks; the screen fills in demo values instead.
  const blocked = Boolean(blockedBy) && !ONBOARDING_TEST_MODE;
  return (
    <Button
      type="button"
      onClick={() => {
        if (!busy && !blocked) onClick?.();
      }}
      disabled={blocked}
      aria-busy={busy || undefined}
      className={cn(
        "h-[52px] w-full gap-2.5 text-[12px] disabled:bg-disabled disabled:text-muted-foreground disabled:opacity-100",
        className
      )}
    >
      {busy ? <Icon icon={LoaderCircle} size={15} strokeWidth={2.2} className="animate-spin" /> : icon && <Icon icon={icon} size={15} strokeWidth={2} />}
      {blocked ? blockedBy : children}
      {!blocked && !busy && arrow && !icon && <Icon icon={ArrowRight} size={13} strokeWidth={2.4} />}
    </Button>
  );
}

export function SecondaryAction({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className={cn("h-12 w-full text-[11.5px]", className)}>
      {children}
    </Button>
  );
}

/** Text-only mono action with a 44px hit area. */
export function TextAction({ children, onClick, href, className }: { children: ReactNode; onClick?: () => void; href?: string; className?: string }) {
  const classes = cn(
    "label-mono inline-flex min-h-11 items-center tracking-[0.1em] text-accent-foreground underline-offset-4 hover:underline",
    className
  );
  if (href) return <a href={href} className={classes}>{children}</a>;
  return <button type="button" onClick={onClick} className={classes}>{children}</button>;
}

/** The one exempt round shape. */
export function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-5 flex-none rounded-full bg-background", checked ? "border-[6px] border-primary" : "border-[1.5px] border-control")}
    />
  );
}

export function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-px grid size-[22px] flex-none place-items-center",
        checked ? "bg-primary text-primary-foreground" : "border-[1.5px] border-control bg-background"
      )}
    >
      {checked && <Icon icon={Check} size={13} strokeWidth={3.4} />}
    </span>
  );
}

const ROW_FOCUS = "has-[input:focus-visible]:relative has-[input:focus-visible]:z-10 has-[input:focus-visible]:outline-[1.5px] has-[input:focus-visible]:outline-primary has-[input:focus-visible]:outline-offset-2";

/** Full-width radio row for language, work and package choices. */
export function ChoiceRow({
  name,
  value,
  checked,
  onSelect,
  children,
  leading,
  trailing,
  className
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3.5 border-b px-3.5 transition-colors",
        checked ? "border-blue-line bg-accent" : "border-line-soft hover:bg-accent/60",
        ROW_FOCUS,
        className
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onSelect(value)} className="sr-only" />
      {leading}
      <span className="min-w-0 flex-1">{children}</span>
      {trailing}
    </label>
  );
}

export function CheckRow({
  checked,
  onToggle,
  title,
  detail
}: {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  title: string;
  detail: string;
}) {
  return (
    <label className={cn("flex cursor-pointer gap-[13px] border-b border-line-soft px-0.5 py-[13px] last:border-b-0", ROW_FOCUS)}>
      <input type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} className="sr-only" />
      <CheckMark checked={checked} />
      <span>
        <span className="block text-[14.5px] font-medium">{title}</span>
        <span className="block text-[13px] text-muted-foreground">{detail}</span>
      </span>
    </label>
  );
}

/** Numbered row used on entry and worker home: 01 Pick your work. */
export function NumberedStep({ index, title, detail, active = true, tone = "light" }: { index: number; title: string; detail: string; active?: boolean; tone?: "light" | "dark" }) {
  return (
    <li className={cn("flex gap-3.5 border-b py-3.5 last:border-b-0", tone === "dark" ? "border-[#2E2E33]" : "border-border")}>
      <span
        className={cn(
          "tabular w-5 flex-none font-mono text-[11px] font-medium",
          tone === "dark" ? "text-[#7FA0FF]" : active ? "text-accent-foreground" : "text-muted-foreground"
        )}
      >
        {String(index).padStart(2, "0")}
      </span>
      <span>
        <span className="block text-[15px] font-medium">{title}</span>
        <span className={cn("block text-[13px]", tone === "dark" ? "text-[#9C9EA5]" : "text-muted-foreground")}>{detail}</span>
      </span>
    </li>
  );
}

/** Cross-field or submit-level problem: one banner, Needs fix treatment (DESIGN.md §5). */
export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mt-4 border border-state-fix-border bg-state-fix-bg px-3.5 py-3 text-[13px] leading-[1.5] text-state-fix">
      {children}
    </div>
  );
}
