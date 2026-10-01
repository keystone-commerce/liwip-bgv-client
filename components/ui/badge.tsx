import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex min-h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-none border border-transparent px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.11em] whitespace-nowrap transition-colors focus-visible:outline-[1.5px] focus-visible:outline-primary focus-visible:outline-offset-2 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "border-destructive bg-[var(--state-fix-bg)] text-destructive [a]:hover:bg-[var(--state-fix-border)]",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        verified: "border-state-verified-border bg-state-verified-bg text-state-verified",
        review: "border-state-review-border bg-state-review-bg text-state-review",
        fix: "border-state-fix-border bg-state-fix-bg text-state-fix",
        checking: "border-state-checking-border bg-state-checking-bg text-state-checking",
        queued: "border-state-queued-border bg-state-queued-bg text-state-queued",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
