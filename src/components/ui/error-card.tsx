"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

type ErrorCardProps = {
  pageKey: "today" | "employees" | "payroll" | "reports" | "profile";
  message: string;
};

export function ErrorCard({ pageKey, message }: ErrorCardProps) {
  const { locale, t } = useLocale();
  const page =
    pageKey === "profile"
      ? {
          errorTitle: locale === "bg" ? "Живите данни не могат да се заредят" : "Live data could not be loaded",
          errorDescription:
            locale === "bg"
              ? "Supabase env vars са налични, затова демо fallback-ът е изключен."
              : "Supabase env vars are present, so demo fallback is intentionally disabled.",
        }
      : t.pages[pageKey as keyof typeof t.pages];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{page.errorTitle}</CardTitle>
        <CardDescription>{page.errorDescription}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
