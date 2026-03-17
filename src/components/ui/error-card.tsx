"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import type { PageKey } from "@/lib/i18n/translations";

type ErrorCardProps = {
  pageKey: PageKey;
  message: string;
};

export function ErrorCard({ pageKey, message }: ErrorCardProps) {
  const { t } = useLocale();
  const page = t.pages[pageKey];

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
