import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { StateBadge, type VerificationState } from "@/components/state-badge";
import { cn } from "@/lib/utils";
import { Icon } from "./shell";

/** Mini Liwip BGV Card (DESIGN.md §13): ink header strip, then check rows or an overview bar. */
export function BgvCard({ applicationId, locked = false, children, className }: { applicationId?: string; locked?: boolean; children: ReactNode; className?: string }) {
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
          applicationId && <span className="tabular font-mono text-[11px] text-[#9C9EA5]">{applicationId}</span>
        )}
      </div>
      {children}
    </section>
  );
}

export function BgvCardRow({ label, state, stateLabel, muted = false }: { label: string; state: VerificationState; stateLabel?: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0">
      <span className={cn("text-[13px]", muted ? "text-muted-foreground" : "font-medium")}>{label}</span>
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
