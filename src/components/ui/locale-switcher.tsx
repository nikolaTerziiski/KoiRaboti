"use client";

import { useLocale } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "en" ? "bg" : "en")}
      className="font-semibold tracking-wide"
      aria-label="Switch language"
    >
      {locale === "en" ? "БГ" : "EN"}
    </Button>
  );
}
