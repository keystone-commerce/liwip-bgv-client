import { CircleAlert, CircleCheck, Clock3, LoaderCircle, TriangleAlert, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** The five verification states (DESIGN.md §2). Never add a sixth. */
export type VerificationState = "verified" | "review" | "fix" | "checking" | "queued";

const ICONS: Record<VerificationState, LucideIcon> = {
  verified: CircleCheck,
  review: TriangleAlert,
  fix: CircleAlert,
  checking: LoaderCircle,
  queued: Clock3
};

export const STATE_LABELS: Record<VerificationState, string> = {
  verified: "Verified",
  review: "In review",
  fix: "Needs fix",
  checking: "Checking",
  queued: "In queue"
};

/** Filled rectangle, 1px border and an icon, so the state survives without colour. */
export function StateBadge({ state, label, className }: { state: VerificationState; label?: string; className?: string }) {
  const Icon = ICONS[state];
  return (
    <Badge variant={state} className={className}>
      <Icon data-icon="inline-start" aria-hidden="true" strokeWidth={2.6} strokeLinecap="square" className={state === "checking" ? "animate-spin" : undefined} />
      {label ?? STATE_LABELS[state]}
    </Badge>
  );
}
