import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary/20 text-secondary",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border",
        // Skill level variants
        beginner: "border-transparent bg-beginner/15 text-beginner font-semibold",
        intermediate: "border-transparent bg-intermediate/15 text-intermediate font-semibold",
        advanced: "border-transparent bg-advanced/15 text-advanced font-semibold",
        // Industry variants
        tech: "border-transparent bg-tech/10 text-tech",
        design: "border-transparent bg-design/10 text-design",
        marketing: "border-transparent bg-marketing/10 text-marketing",
        business: "border-transparent bg-business/10 text-business",
        // Soft variant for tags
        soft: "border-transparent bg-muted text-muted-foreground",
        // Accent for highlighted items
        accent: "border-transparent bg-accent text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
