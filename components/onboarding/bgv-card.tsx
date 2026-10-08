import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { StateBadge, type VerificationState } from "@/components/state-badge";
import { cn } from "@/lib/utils";
import { Icon } from "./shell";

/** Mini Liwip BGV Card (DESIGN.md §13): ink header strip, then check rows or an overview bar. */
export function BgvCard({ cardNumber, locked = false, children, className }: { cardNumber?: string; locked?: boolean; children: ReactNode; className?: string }) {
  return (
    <section aria-label="Liwip BGV Card" className={cn("border border-foreground bg-background", className)}>
      <div className="flex items-center justify-between bg-foreground px-3 py-[9px] text-white">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-[9px] bg-primary" />
          <span className="label-mono tracking-[0.12em]">Liwip BGV Card</span>
        </span>
        {locked ? (
          <span className="text-[#9C9EA5]">
            <Icon icon={Lock} size={12} strokeWidth={2} />
            <span className="sr-only">Locked</span>
          </span>
        ) : (
          cardNumber && (
            <span className="tabular font-mono text-[11px] tracking-[0.06em] text-[#9C9EA5]">
              <span className="sr-only">Card number </span>
              {cardNumber}
            </span>
          )
        )}
      </div>
      {children}
    </section>
  );
}

export function BgvCardRow({
  label,
  detail,
  state,
  stateLabel,
  muted = false
}: {
  label: string;
  /** One line under the label, for a row that is not done yet. */
  detail?: string;
  state: VerificationState;
  stateLabel?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0">
      <span className="min-w-0">
        <span className={cn("block text-[13px]", muted ? "text-secondary-text" : "font-medium")}>{label}</span>
        {detail && <span className="block text-[12.5px] leading-[1.45] text-secondary-text">{detail}</span>}
      </span>
      <StateBadge state={state} label={stateLabel} />
    </div>
  );
}

/** One segment per check: verified green, live blue, everything else on the track. */
export function CheckBar({ states, className }: { states: (VerificationState | "hidden")[]; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex gap-[3px]", className)}>
      {states.map((state, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 flex-1",
            state === "verified" ? "bg-state-verified" : state === "checking" ? "bg-primary" : state === "fix" ? "bg-state-fix" : state === "review" ? "bg-state-review" : "bg-track"
          )}
        />
      ))}
    </div>
  );
}
