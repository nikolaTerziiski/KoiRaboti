import { cn } from "@/lib/utils";
import {
  formatBgnCurrencyFromEur,
  formatCompactBgnCurrencyFromEur,
  formatCompactCurrency,
  formatCurrency,
} from "@/lib/format";

type MoneyDisplayProps = {
  amount: number;
  compact?: boolean;
  align?: "start" | "end";
  className?: string;
  secondaryClassName?: string;
};

export function MoneyDisplay({
  amount,
  compact = false,
  align = "start",
  className,
  secondaryClassName,
}: MoneyDisplayProps) {
  const primary = compact ? formatCompactCurrency(amount) : formatCurrency(amount);
  const secondary = compact
    ? formatCompactBgnCurrencyFromEur(amount)
    : formatBgnCurrencyFromEur(amount);

  return (
    <div
      className={cn(
        "flex flex-col",
        align === "end" ? "items-end text-right" : "items-start",
        className,
      )}
    >
      <span className="font-semibold">{primary}</span>
      <span className={cn("text-xs text-muted-foreground", secondaryClassName)}>
        {secondary}
      </span>
    </div>
  );
}
