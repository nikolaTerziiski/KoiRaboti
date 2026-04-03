"use client";

import * as React from "react";
import Image from "next/image";
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

const STORY_SCREENSHOT_SOURCES: Partial<Record<StoryScene["id"], string>> = {};

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

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out will-change-transform motion-reduce:translate-y-0 motion-reduce:opacity-100",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
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
    <SurfaceCard className={cn("h-full min-h-[23rem] p-6 sm:p-7", className)}>
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

      <div className="mt-6 space-y-2.5">
        <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {copy.title}
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">{copy.description}</p>
      </div>

      <div className="mt-6 rounded-[1.6rem] border border-border/50 bg-background p-4">
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

function StoryProofVisual({
  scene,
  previewLabel,
  resultLabel,
  productLabel,
}: {
  scene: StoryScene;
  previewLabel: string;
  resultLabel: string;
  productLabel: string;
}) {
  const screenshotSrc = STORY_SCREENSHOT_SOURCES[scene.id];

  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-border/60 bg-background p-3 shadow-sm">
        <div className="rounded-[1.5rem] border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <Badge
              variant="outline"
              className="border-border/60 bg-background px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              {previewLabel}
            </Badge>
            <div className="flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-background">
              <MessageSquareText className="size-4 text-foreground" />
            </div>
          </div>

          {screenshotSrc ? (
            <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-border/60 bg-background">
              <Image
                src={screenshotSrc}
                alt={scene.phone.title}
                width={720}
                height={1280}
                className="h-[26rem] w-full object-cover object-top"
              />
            </div>
          ) : (
            <div className="mt-4 rounded-[1.35rem] border border-border/60 bg-background/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {scene.phone.badge}
              </p>
              <p className="mt-2 text-lg font-bold tracking-tight text-foreground">
                {scene.phone.title}
              </p>
              <div className="mt-4 space-y-3">
                {scene.phone.messages.map((message, index) => (
                  <div
                    key={`${scene.id}-${index}`}
                    className={cn(
                      "max-w-[88%] rounded-[1.3rem] px-4 py-3 text-sm leading-6 text-foreground",
                      message.sender === "owner"
                        ? "ml-auto rounded-br-md bg-primary/10"
                        : "rounded-bl-md bg-secondary",
                    )}
                  >
                    {message.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-border/60 bg-background p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {resultLabel}
          </p>
          <p className="mt-2 text-base font-semibold text-foreground">{scene.phone.summaryValue}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{scene.phone.summaryMeta}</p>
        </div>

        <div className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {productLabel}
          </p>
          <p className="mt-2 text-base font-semibold text-foreground">{scene.phone.summaryLabel}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{scene.outcome}</p>
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

  const authLabels =
    locale === "bg"
      ? { signIn: "Вход", register: "Регистрация" }
      : { signIn: "Sign in", register: "Register" };
  const homeLinkLabel = locale === "bg" ? "Начало KoiRaboti" : "KoiRaboti home";
  const storyPreviewLabel = locale === "bg" ? "В Telegram" : "In Telegram";
  const storyResultLabel = locale === "bg" ? "Записано за деня" : "Saved for the day";
  const storyProductLabel = locale === "bg" ? "В KoiRaboti" : "In KoiRaboti";
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
          <Reveal className="mx-auto max-w-4xl text-center">
            <SectionEyebrow>{home.hero.badge}</SectionEyebrow>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
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
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-12 xl:auto-rows-fr">
            {heroCards.map(({ icon, variant, copy, className }, index) => (
              <Reveal key={variant} delay={index * 80} className={cn("h-full", className)}>
                <HeroCard
                  icon={icon}
                  variant={variant}
                  copy={copy}
                  attendanceRows={attendanceRows}
                  payrollRows={payrollRows}
                />
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-20">
          <Reveal className="max-w-4xl">
            <SectionEyebrow>{home.story.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 max-w-5xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {home.story.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {home.story.description}
            </p>
          </Reveal>

          <div className="mt-10 space-y-6 lg:mt-12 lg:space-y-8">
            {home.story.scenes.map((scene, index) => {
              const Icon = storyIcons[index] ?? MessageSquareText;

              return (
                <Reveal key={scene.id} delay={index * 70}>
                  <SurfaceCard className="overflow-hidden">
                    <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
                      <div className="p-7 sm:p-8 lg:p-10">
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

                        <div className="mt-6 max-w-xl">
                          <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            {scene.title}
                          </h3>
                          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                            {scene.description}
                          </p>
                        </div>

                        <div className="mt-6 rounded-[1.5rem] border border-border/60 bg-background px-5 py-4 shadow-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {storyProductLabel}
                          </p>
                          <p className="mt-2 text-base font-semibold leading-7 text-foreground sm:text-lg">
                            {scene.outcome}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-border/60 bg-muted/20 p-5 sm:p-6 lg:border-l lg:border-t-0 lg:p-8">
                        <StoryProofVisual
                          scene={scene}
                          previewLabel={storyPreviewLabel}
                          resultLabel={storyResultLabel}
                          productLabel={storyProductLabel}
                        />
                      </div>
                    </div>
                  </SurfaceCard>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <Reveal className="max-w-3xl">
            <SectionEyebrow>{home.workflow.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {home.workflow.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {home.workflow.description}
            </p>
          </Reveal>

          <div className="relative mt-10 max-w-4xl">
            {home.workflow.steps.map((step, index) => {
              const Icon = workflowIcons[index] ?? Leaf;
              const isLast = index === home.workflow.steps.length - 1;

              return (
                <Reveal key={step.title} delay={index * 70}>
                  <article className="relative pl-20">
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
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <Reveal className="max-w-3xl">
            <SectionEyebrow>{home.audience.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {home.audience.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {home.audience.description}
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 lg:grid-cols-12">
            <Reveal className="lg:col-span-7">
              <SurfaceCard className="h-full p-7">
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
            </Reveal>

            <Reveal className="lg:col-span-5" delay={90}>
              <SurfaceCard className="h-full p-7">
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
            </Reveal>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <Reveal className="max-w-3xl">
            <SectionEyebrow>{home.evidence.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {home.evidence.title}
            </h2>
          </Reveal>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {evidenceItems.map(({ icon: Icon, copy }, index) => (
              <Reveal key={copy.title} delay={index * 60}>
                <SurfaceCard className="h-full p-5">
                  <div className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-background">
                    <Icon className="size-4 text-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold tracking-tight text-foreground">
                    {copy.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.description}</p>
                </SurfaceCard>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-16 lg:pt-12">
          <Reveal>
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
          </Reveal>
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
