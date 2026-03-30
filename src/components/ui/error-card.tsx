"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

type ErrorCardProps = {
  pageKey: "today" | "transactions" | "employees" | "payroll" | "reports" | "profile";
  message: string;
};

export function ErrorCard({ pageKey, message }: ErrorCardProps) {
  const { t } = useLocale();
  const page = t.pages[pageKey];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{page.errorTitle}</CardTitle>
        <CardDescription>{t.shell.dataLoadError}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
