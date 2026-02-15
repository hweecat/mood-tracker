import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-xl border-2 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-700 text-white shadow-md",
        secondary:
          "border-border bg-secondary text-foreground",
        destructive:
          "border-red-300 bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-300 dark:border-transparent",
        outline: "text-foreground border-border",
        success: 
          "border-green-300 bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-300 dark:border-transparent",
        warning:
          "border-yellow-300 bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-transparent",
        purple:
          "border-purple-300 bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-300 dark:border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
