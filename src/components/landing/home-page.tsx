"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Fuel,
  Languages,
  Leaf,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users2,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { useLocale } from "@/lib/i18n/context";
import { homeTranslations, type HomeTranslations } from "@/lib/i18n/home-translations";
import { cn } from "@/lib/utils";

type HeroCardVariant = "attendance" | "telegram" | "payroll";

type StoryScene = HomeTranslations["story"]["scenes"][number];

function BrandLockup({
  subtitle,
  inverted = false,
}: {
  subtitle: string;
  inverted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-2xl border shadow-sm",
          inverted
            ? "border-slate-800 bg-slate-900 text-emerald-400"
            : "border-border/60 bg-card text-primary",
        )}
      >
        <Leaf className="size-5" />
      </div>
      <div>
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.24em]",
            inverted ? "text-slate-50" : "text-foreground",
          )}
        >
          KoiRaboti
        </p>
        <p className={cn("text-sm", inverted ? "text-slate-400" : "text-muted-foreground")}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm">
      <span className="size-1.5 rounded-full bg-primary" />
      {children}
    </span>
  );
}

function SurfaceCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[2rem] border border-border/60 bg-card shadow-sm", className)}>
      {children}
    </div>
  );
}

function HeroCard({
  icon: Icon,
  copy,
  variant,
  attendanceRows,
  payrollRows,
  className,
}: {
  icon: LucideIcon;
  copy: HomeTranslations["hero"]["bento"][HeroCardVariant];
  variant: HeroCardVariant;
  attendanceRows: Array<{ label: string; value: string }>;
  payrollRows: Array<{ label: string; value: string }>;
  className?: string;
}) {
  return (
    <SurfaceCard className={cn("h-full min-h-[21rem] p-6 sm:p-7", className)}>
      <div className="flex items-center justify-between gap-3">
        <Badge
          variant="outline"
          className="border-border/60 bg-background px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          {copy.eyebrow}
        </Badge>
        <div className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-background">
          <Icon className="size-4 text-foreground" />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {copy.title}
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">{copy.description}</p>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-border/50 bg-background p-4">
        <p className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">
          {copy.value}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.meta}</p>

        {variant === "attendance" ? (
          <div className="mt-5 space-y-3">
            {attendanceRows.map((row, index) => (
              <div key={row.label} className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-card text-xs font-semibold text-foreground">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-2 rounded-full bg-primary",
                        index === 0 && "w-3/5",
                        index === 1 && "w-4/5",
                        index === 2 && "w-2/5",
                      )}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {variant === "telegram" ? (
          <div className="mt-5 space-y-3">
            <div className="ml-auto max-w-[85%] rounded-[1.25rem] rounded-br-md bg-primary/10 px-4 py-3 text-sm leading-6 text-foreground">
              {copy.value}
            </div>
            <div className="max-w-[88%] rounded-[1.25rem] rounded-bl-md bg-secondary px-4 py-3 text-sm leading-6 text-foreground">
              {copy.meta}
            </div>
          </div>
        ) : null}

        {variant === "payroll" ? (
          <div className="mt-5 space-y-3">
            {payrollRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-2xl border border-border/50 bg-card px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-semibold text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}

function StoryPhone({
  scene,
  compact = false,
}: {
  scene: StoryScene;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[400px] rounded-[2.4rem] border border-border/60 bg-card p-3 shadow-sm",
        compact && "max-w-full rounded-[1.9rem] p-2.5 shadow-none",
      )}
    >
      <div className="rounded-[2rem] border border-border/60 bg-background p-4">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-border/80" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge
              variant="outline"
              className="border-border/60 bg-card px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              {scene.phone.badge}
            </Badge>
            <p className="mt-3 text-lg font-bold tracking-tight text-foreground">
              {scene.phone.title}
            </p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-card">
            <MessageSquareText className="size-4 text-foreground" />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {scene.phone.messages.map((message, index) => (
            <div
              key={`${scene.id}-${index}`}
              className={cn(
                "max-w-[88%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 text-foreground",
                message.sender === "owner"
                  ? "ml-auto rounded-br-md bg-primary/10"
                  : "rounded-bl-md bg-secondary",
              )}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-border/60 bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {scene.phone.summaryLabel}
          </p>
          <p className="mt-2 text-base font-semibold text-foreground">{scene.phone.summaryValue}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {scene.phone.summaryMeta}
          </p>
        </div>
      </div>
    </div>
  );
}

function CtaRow({
  primaryLabel,
  secondaryLabel,
}: {
  primaryLabel: string;
  secondaryLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href="/register">
          {primaryLabel}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        size="lg"
        className="w-full border-border/60 bg-background sm:w-auto"
      >
        <Link href="/login">{secondaryLabel}</Link>
      </Button>
    </div>
  );
}

export function HomePage() {
  const { locale, t } = useLocale();
  const home = homeTranslations[locale];
  const sceneRefs = React.useRef<Array<HTMLElement | null>>([]);
  const [activeStoryIndex, setActiveStoryIndex] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateActive = () => {
      const nodes = sceneRefs.current.filter(
        (node): node is HTMLElement => node instanceof HTMLElement,
      );

      if (nodes.length === 0) {
        return;
      }

      const viewportAnchor = window.innerHeight * 0.42;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      nodes.forEach((node, index) => {
        const rect = node.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const distance = Math.abs(midpoint - viewportAnchor);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      setActiveStoryIndex((current) => (current === bestIndex ? current : bestIndex));
    };

    let frameId = 0;
    const handleScroll = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        updateActive();
        frameId = 0;
      });
    };

    updateActive();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [home.story.scenes]);

  const activeScene = home.story.scenes[activeStoryIndex] ?? home.story.scenes[0];
  const authLabels =
    locale === "bg"
      ? { signIn: "Вход", register: "Регистрация" }
      : { signIn: "Sign in", register: "Register" };
  const homeLinkLabel = locale === "bg" ? "Начало KoiRaboti" : "KoiRaboti home";
  const storyPreviewLabel = locale === "bg" ? "Как изглежда в приложението" : "In the product";
  const storyEffectLabel = locale === "bg" ? "Какво се променя" : "What changes";
  const attendanceRows =
    locale === "bg"
      ? [
          { label: "Кухня", value: "6 души" },
          { label: "Сервиз", value: "8 души" },
          { label: "Затваряне", value: "4 души" },
        ]
      : [
          { label: "Kitchen", value: "6 people" },
          { label: "Service", value: "8 people" },
          { label: "Closing", value: "4 people" },
        ];
  const payrollRows =
    locale === "bg"
      ? [
          { label: "За плащане тази седмица", value: "4" },
          { label: "Записани аванси", value: "2" },
          { label: "Оставащ баланс", value: "Видим" },
        ]
      : [
          { label: "Due this week", value: "4" },
          { label: "Advances logged", value: "2" },
          { label: "Remaining balance", value: "Visible" },
        ];

  const heroCards: Array<{
    icon: LucideIcon;
    variant: HeroCardVariant;
    copy: HomeTranslations["hero"]["bento"][HeroCardVariant];
    className: string;
  }> = [
    {
      icon: Users2,
      variant: "attendance",
      copy: home.hero.bento.attendance,
      className: "md:col-span-1 xl:col-span-5",
    },
    {
      icon: MessageSquareText,
      variant: "telegram",
      copy: home.hero.bento.telegram,
      className: "md:col-span-1 xl:col-span-4",
    },
    {
      icon: WalletCards,
      variant: "payroll",
      copy: home.hero.bento.payroll,
      className: "md:col-span-2 xl:col-span-3",
    },
  ];

  const storyIcons: LucideIcon[] = [Fuel, ReceiptText, CheckCircle2];
  const workflowIcons: LucideIcon[] = [Leaf, Clock3, TrendingUp];

  const evidenceItems: Array<{
    icon: LucideIcon;
    copy: HomeTranslations["evidence"]["items"][keyof HomeTranslations["evidence"]["items"]];
  }> = [
    { icon: Smartphone, copy: home.evidence.items.mobile },
    { icon: Languages, copy: home.evidence.items.bilingual },
    { icon: ShieldCheck, copy: home.evidence.items.separation },
    { icon: CheckCircle2, copy: home.evidence.items.modes },
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label={homeLinkLabel}>
            <BrandLockup subtitle={t.shell.subtitle} />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <LocaleSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{authLabels.signIn}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">{authLabels.register}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <SectionEyebrow>{home.hero.badge}</SectionEyebrow>
            <h1 className="mt-5 text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              {home.hero.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {home.hero.description}
            </p>

            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="min-w-[220px]">
                <Link href="/register">
                  {home.hero.primaryCta}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <Clock3 className="size-4 text-primary" />
              {home.hero.note}
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-12 xl:auto-rows-fr">
            {heroCards.map(({ icon, variant, copy, className }) => (
              <HeroCard
                key={variant}
                icon={icon}
                variant={variant}
                copy={copy}
                attendanceRows={attendanceRows}
                payrollRows={payrollRows}
                className={className}
              />
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-18">
          <div className="max-w-4xl">
            <SectionEyebrow>{home.story.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {home.story.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {home.story.description}
            </p>
          </div>

          <div className="mt-14 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-12">
            <div className="space-y-6">
              {home.story.scenes.map((scene, index) => {
                const Icon = storyIcons[index] ?? MessageSquareText;
                const isActive = activeStoryIndex === index;

                return (
                  <article
                    key={scene.id}
                    ref={(node) => {
                      sceneRefs.current[index] = node;
                    }}
                    className="scroll-mt-28"
                  >
                    <SurfaceCard
                      className={cn(
                        "p-7 sm:p-8 transition-all",
                        isActive
                          ? "border-border/80 bg-card shadow-sm"
                          : "border-border/50 bg-background",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-2xl border border-border/60 bg-background">
                          <Icon className="size-5 text-foreground" />
                        </div>
                        <Badge
                          variant="outline"
                          className="border-border/60 bg-background px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                        >
                          {scene.eyebrow}
                        </Badge>
                      </div>

                      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
                        <div>
                          <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            {scene.title}
                          </h3>
                          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                            {scene.description}
                          </p>
                        </div>

                        <div className="rounded-[1.5rem] border border-border/50 bg-background px-5 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {storyEffectLabel}
                          </p>
                          <p className="mt-2 text-sm font-medium leading-6 text-foreground">
                            {scene.outcome}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 xl:hidden">
                        <StoryPhone scene={scene} compact />
                      </div>
                    </SurfaceCard>
                  </article>
                );
              })}
            </div>

            <div className="hidden xl:block">
              <div className="sticky top-28">
                <SurfaceCard className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <Badge
                      variant="outline"
                      className="border-border/60 bg-background px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {activeScene.eyebrow}
                    </Badge>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {storyPreviewLabel}
                    </p>
                  </div>
                  <StoryPhone scene={activeScene} compact />
                </SurfaceCard>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <SectionEyebrow>{home.workflow.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {home.workflow.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {home.workflow.description}
            </p>
          </div>

          <div className="relative mt-10 max-w-4xl">
            {home.workflow.steps.map((step, index) => {
              const Icon = workflowIcons[index] ?? Leaf;
              const isLast = index === home.workflow.steps.length - 1;

              return (
                <article key={step.title} className="relative pl-20">
                  {!isLast ? (
                    <span className="absolute left-[1.4rem] top-12 h-[calc(100%-0.5rem)] w-px bg-border/60" />
                  ) : null}

                  <div className="absolute left-0 top-0 flex size-11 items-center justify-center rounded-full border border-border/60 bg-card shadow-sm">
                    <Icon className="size-5 text-foreground" />
                  </div>

                  <div className="pb-12">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {step.meta}
                    </p>
                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <SectionEyebrow>{home.audience.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {home.audience.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {home.audience.description}
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-12">
            <SurfaceCard className="p-7 lg:col-span-7">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-border/60 bg-background">
                  <WalletCards className="size-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {home.audience.owners.title}
                  </p>
                  <h3 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {home.audience.owners.description}
                  </h3>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {home.audience.owners.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-3 rounded-[1.5rem] border border-border/50 bg-background px-5 py-4 text-sm leading-6 text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </SurfaceCard>

            <SurfaceCard className="p-7 lg:col-span-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-border/60 bg-background">
                  <Users2 className="size-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {home.audience.staff.title}
                  </p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground">
                    {home.audience.staff.description}
                  </h3>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {home.audience.staff.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <div className="max-w-3xl">
            <SectionEyebrow>{home.evidence.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {home.evidence.title}
            </h2>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {evidenceItems.map(({ icon: Icon, copy }) => (
              <SurfaceCard key={copy.title} className="p-5">
                <div className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-background">
                  <Icon className="size-4 text-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-bold tracking-tight text-foreground">
                  {copy.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.description}</p>
              </SurfaceCard>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-16 lg:pt-12">
          <SurfaceCard className="p-7 sm:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <SectionEyebrow>{home.final.eyebrow}</SectionEyebrow>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {home.final.title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {home.final.description}
                </p>
              </div>

              <CtaRow
                primaryLabel={home.final.primaryCta}
                secondaryLabel={home.final.secondaryCta}
              />
            </div>
          </SurfaceCard>
        </section>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 text-slate-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
          <BrandLockup subtitle={t.shell.subtitle} inverted />
          <p className="max-w-2xl text-sm leading-6 text-slate-400">
            {home.footerDescription}
          </p>
        </div>
      </footer>
    </div>
  );
}
