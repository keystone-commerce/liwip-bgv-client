import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-mono text-[11.5px] font-medium uppercase tracking-[0.11em] whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-[1.5px] focus-visible:outline-primary focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-accent-foreground",
        outline:
          "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground",
        secondary:
          "border-foreground bg-foreground text-background hover:bg-foreground/85 aria-expanded:bg-foreground aria-expanded:text-background",
        ghost:
          "hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/85 focus-visible:outline-destructive",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-12 gap-2.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-12 gap-2 px-3 text-[10.5px] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-12 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-14 gap-3 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-12",
        "icon-xs":
          "size-12 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-12 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
