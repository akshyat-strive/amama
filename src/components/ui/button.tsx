import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Pinterest-flavoured button: full pill, semibold label, chunky touch target,
 * and a springy press that scales down instead of nudging down a pixel.
 *
 * Contrast notes:
 * - `default` sits on --amama-deep (#047D4E) with white text → 5.19:1 (AA).
 * - `brand` sits on the bright identity green (#00D084) with near-black text
 *   → 9.59:1. White on bright green is only 2.03:1, so it is never offered.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 select-none items-center justify-center",
    "rounded-full border border-transparent bg-clip-padding font-semibold whitespace-nowrap",
    "outline-none transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out",
    "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "active:scale-[0.97] motion-reduce:active:scale-100 motion-reduce:transition-none",
    "disabled:pointer-events-none disabled:opacity-40",
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-amama-deep-hover",
        brand: "bg-amama text-amama-foreground hover:bg-amama/85",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_7%)]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive:
          "bg-destructive text-white hover:bg-[color-mix(in_oklch,var(--destructive),black_12%)] focus-visible:ring-destructive/30",
        link: "h-auto rounded-none px-0 font-semibold text-foreground underline underline-offset-4 hover:text-muted-foreground active:scale-100",
      },
      size: {
        /** 44px — the smallest comfortable touch target (Apple HIG). */
        default: "h-11 gap-2 px-5 text-[15px]",
        sm: "h-9 gap-1.5 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        /** 48px — Material's touch minimum; the standard onboarding CTA. */
        lg: "h-12 gap-2 px-6 text-base",
        /** 56px — hero / full-width primary action. */
        xl: "h-14 gap-2.5 px-8 text-[17px] [&_svg:not([class*='size-'])]:size-6",
        icon: "size-11",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12",
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
