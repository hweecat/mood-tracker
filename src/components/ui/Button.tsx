import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-black uppercase tracking-widest transition-all outline-none focus-visible:ring-4 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-brand-700 text-white border-2 border-brand-800 border-b-8 shadow-xl hover:bg-brand-800 hover:border-brand-900",
        neo: "bg-white text-black border-2 border-black border-b-8 shadow-neo hover:bg-slate-50",
        secondary: "bg-secondary text-foreground border-2 border-border border-b-4 hover:bg-muted",
        outline: "bg-transparent border-2 border-border hover:bg-secondary",
        ghost: "hover:bg-secondary hover:text-accent-foreground border-transparent",
        danger: "bg-red-600 text-white border-2 border-red-800 border-b-8 shadow-xl hover:bg-red-700",
        link: "text-brand-700 underline-offset-4 hover:underline normal-case tracking-normal font-bold",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-16 rounded-[2rem] px-10 text-lg",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
