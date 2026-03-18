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
          errorTitle:
            locale === "bg"
              ? "Живите данни не могат да се заредят"
              : "Live data could not be loaded",
        }
      : t.pages[pageKey as keyof typeof t.pages];
  const errorDescription =
    locale === "bg"
      ? "Реалните данни не могат да се заредят в момента. Моля, опитай отново."
      : "Live data could not be loaded right now. Please try again.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{page.errorTitle}</CardTitle>
        <CardDescription>{errorDescription}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
