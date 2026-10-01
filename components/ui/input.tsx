import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-[52px] w-full min-w-0 rounded-none border border-input bg-background px-4 py-2 font-mono text-base tabular-nums text-foreground transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:font-mono file:text-[11px] file:font-medium file:uppercase file:tracking-[0.11em] file:text-foreground placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:outline-[1.5px] focus-visible:outline-primary focus-visible:outline-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:outline-[1.5px] aria-invalid:outline-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
