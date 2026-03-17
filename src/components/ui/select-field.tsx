import * as React from "react";
import { cn } from "@/lib/utils";

const SelectField = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
SelectField.displayName = "SelectField";

export { SelectField };
