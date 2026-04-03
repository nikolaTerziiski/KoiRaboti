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
  Mail,
  MessageSquareText,
  ReceiptText,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users2,
  WalletCards,
  Zap,
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
  hoverable = false,
  children,
}: {
  className?: string;
  hoverable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-border/60 bg-card shadow-sm",
        hoverable &&
          "transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-md",
        className,
      )}
    >
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

function AnimatedCounter({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = React.useState(0);
  const hasAnimated = React.useRef(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1200;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}

function TelegramMiniDemo({ locale }: { locale: string }) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 800),
      setTimeout(() => setStep(2), 2200),
      setTimeout(() => setStep(3), 3600),
      setTimeout(() => setStep(4), 5000),
    ];
    const loop = setTimeout(() => setStep(0), 7500);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(loop);
    };
  }, [step === 0 ? 0 : undefined]);

  const messages =
    locale === "bg"
      ? {
          user: "Гориво за доставката, 36 лв.",
          bot: "Записах! Гориво — 36 лв. за днес.",
          saved: "Гориво — 36 лв.",
          tag: "Днешен отчет",
        }
      : {
          user: "Fuel for delivery, 36 BGN.",
          bot: "Saved! Fuel — 36 BGN for today.",
          saved: "Fuel — 36 BGN",
          tag: "Today's report",
        };

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      {/* Phone frame */}
      <div className="overflow-hidden rounded-[2rem] border-2 border-slate-800 bg-slate-900 p-1 shadow-2xl">
        <div className="rounded-[1.75rem] bg-slate-950 pb-5 pt-3">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-[#0088cc]">
                <Send className="size-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-200">KoiRaboti Bot</span>
            </div>
            <span className="text-[10px] text-slate-500">Telegram</span>
          </div>

          {/* Chat area */}
          <div className="min-h-[180px] space-y-2.5 px-3 sm:min-h-[210px]">
            {/* User message */}
            <div
              className={cn(
                "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#0088cc] px-3.5 py-2.5 text-sm text-white transition-all duration-500",
                step >= 1
                  ? "translate-y-0 opacity-100"
                  : "translate-y-3 opacity-0",
              )}
            >
              {messages.user}
            </div>

            {/* Typing indicator */}
            <div
              className={cn(
                "flex max-w-[60%] items-center gap-1.5 rounded-2xl rounded-bl-md bg-slate-800 px-4 py-3 transition-all duration-300",
                step === 1
                  ? "translate-y-0 opacity-100"
                  : step >= 2
                    ? "hidden"
                    : "translate-y-3 opacity-0",
              )}
            >
              <span className="size-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
            </div>

            {/* Bot response */}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl rounded-bl-md bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 transition-all duration-500",
                step >= 2
                  ? "translate-y-0 opacity-100"
                  : "translate-y-3 opacity-0",
              )}
            >
              {messages.bot}
            </div>

            {/* Success confirmation */}
            <div
              className={cn(
                "mx-auto flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 transition-all duration-500",
                step >= 3
                  ? "scale-100 opacity-100"
                  : "scale-90 opacity-0",
              )}
            >
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">{messages.saved}</span>
            </div>
          </div>

          {/* Bottom bar showing it's in the report */}
          <div
            className={cn(
              "mx-3 mt-3 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 transition-all duration-500",
              step >= 4
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {messages.tag}
              </span>
              <Sparkles className="size-3 text-emerald-400" />
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-200">{messages.saved}</p>
          </div>
        </div>
      </div>
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
    <SurfaceCard hoverable className={cn("h-full min-h-0 p-5 sm:min-h-[22rem] sm:p-7", className)}>
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

      <div className="mt-5 space-y-2 sm:mt-6 sm:space-y-2.5">
        <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">
          {copy.title}
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">{copy.description}</p>
      </div>

      <div className="mt-5 rounded-[1.45rem] border border-border/50 bg-background p-3.5 sm:mt-6 sm:rounded-[1.6rem] sm:p-4">
        <p className="text-xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">
          {copy.value}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.meta}</p>

        {variant === "attendance" ? (
          <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
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
          <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
            <div className="ml-auto max-w-[85%] rounded-[1.25rem] rounded-br-md bg-[#0088cc]/15 px-4 py-3 text-sm leading-6 text-foreground">
              {copy.value}
            </div>
            <div className="max-w-[88%] rounded-[1.25rem] rounded-bl-md bg-secondary px-4 py-3 text-sm leading-6 text-foreground">
              {copy.meta}
            </div>
          </div>
        ) : null}

        {variant === "payroll" ? (
          <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
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
    <div className="space-y-3 sm:space-y-4">
      <div className="rounded-[1.5rem] border border-border/60 bg-background p-2.5 shadow-sm sm:rounded-[1.75rem] sm:p-3">
        <div className="rounded-[1.3rem] border border-border/60 bg-card p-3 sm:rounded-[1.5rem] sm:p-4">
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
                className="h-[15rem] w-full object-cover object-top sm:h-[18rem] lg:h-[26rem]"
              />
            </div>
          ) : (
            <div className="mt-3 rounded-[1.2rem] border border-border/60 bg-background/80 p-3 sm:mt-4 sm:rounded-[1.35rem] sm:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {scene.phone.badge}
              </p>
              <p className="mt-2 text-base font-bold tracking-tight text-foreground sm:text-lg">
                {scene.phone.title}
              </p>
              <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                {scene.phone.messages.map((message, index) => (
                  <div
                    key={`${scene.id}-${index}`}
                    className={cn(
                      "max-w-[88%] rounded-[1.1rem] px-3 py-2.5 text-sm leading-6 text-foreground sm:rounded-[1.3rem] sm:px-4 sm:py-3",
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
        <div className="rounded-[1.3rem] border border-border/60 bg-background p-3.5 shadow-sm sm:rounded-[1.5rem] sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {resultLabel}
          </p>
          <p className="mt-2 text-base font-semibold text-foreground">{scene.phone.summaryValue}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{scene.phone.summaryMeta}</p>
        </div>

        <div className="rounded-[1.3rem] border border-border/60 bg-card p-3.5 shadow-sm sm:rounded-[1.5rem] sm:p-4">
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
  const [isHeaderHidden, setIsHeaderHidden] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    let previousScrollY = window.scrollY;
    let frameId = 0;

    const updateHeaderVisibility = () => {
      const currentScrollY = window.scrollY;

      if (!mediaQuery.matches) {
        setIsHeaderHidden(false);
        previousScrollY = currentScrollY;
        frameId = 0;
        return;
      }

      if (currentScrollY <= 24) {
        setIsHeaderHidden(false);
      } else if (currentScrollY > previousScrollY + 10) {
        setIsHeaderHidden(true);
      } else if (currentScrollY < previousScrollY - 10) {
        setIsHeaderHidden(false);
      }

      previousScrollY = currentScrollY;
      frameId = 0;
    };

    const handleScroll = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(updateHeaderVisibility);
    };

    const handleMediaChange = () => {
      previousScrollY = window.scrollY;
      setIsHeaderHidden(false);
    };

    updateHeaderVisibility();
    window.addEventListener("scroll", handleScroll, { passive: true });
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", handleScroll);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  const authLabels =
    locale === "bg"
      ? {
          signIn: "Вход",
          register: "Регистрация",
        }
      : { signIn: "Sign in", register: "Register" };
  const homeLinkLabel =
    locale === "bg" ? "Начало KoiRaboti" : "KoiRaboti home";
  const storyPreviewLabel = locale === "bg" ? "В Telegram" : "In Telegram";
  const storyResultLabel =
    locale === "bg" ? "Записано за деня" : "Saved for the day";
  const storyProductLabel =
    locale === "bg" ? "В KoiRaboti" : "In KoiRaboti";
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
          {
            label: "За плащане тази седмица",
            value: "4",
          },
          { label: "Записани аванси", value: "2" },
          {
            label: "Оставащ баланс",
            value: "Видим",
          },
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
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <header
        className={cn(
          "sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md transition-[transform,opacity] duration-300 ease-out will-change-transform lg:translate-y-0 lg:opacity-100",
          isHeaderHidden
            ? "pointer-events-none -translate-y-full opacity-0"
            : "pointer-events-auto translate-y-0 opacity-100",
        )}
      >
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

      <main className="flex-1">
        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-24">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_340px] lg:gap-12 xl:grid-cols-[1fr_380px]">
            <Reveal className="max-w-3xl lg:text-left">
              <SectionEyebrow>{home.hero.badge}</SectionEyebrow>
              <h1 className="mt-4 text-[2.6rem] font-bold tracking-tight text-foreground sm:mt-5 sm:text-6xl lg:text-7xl">
                {home.hero.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
                {home.hero.description}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="min-w-[220px]">
                  <Link href="/register">
                    {home.hero.primaryCta}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                  <Zap className="size-3.5" />
                  {home.hero.pricingBadge}
                </span>
              </div>

              <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm sm:mt-5">
                <Clock3 className="size-4 text-primary" />
                {home.hero.note}
              </div>
            </Reveal>

            <Reveal delay={200} className="hidden lg:block">
              <TelegramMiniDemo locale={locale} />
            </Reveal>
          </div>

          {/* Mobile-only: Telegram demo below hero text */}
          <Reveal delay={150} className="mt-8 lg:hidden">
            <TelegramMiniDemo locale={locale} />
          </Reveal>

          <div className="mx-auto mt-8 grid max-w-md gap-3 sm:mt-12 sm:max-w-none sm:gap-4 md:grid-cols-2 xl:grid-cols-12 xl:auto-rows-fr">
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

        {/* Social proof */}
        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
          <Reveal>
            <div className="rounded-[2rem] border border-primary/20 bg-gradient-to-br from-emerald-50/80 to-background p-6 sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
                <div>
                  <SectionEyebrow>{home.socialProof.eyebrow}</SectionEyebrow>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {home.socialProof.headline}
                  </h2>
                  <p className="mt-3 max-w-xl text-base italic leading-relaxed text-muted-foreground">
                    &ldquo;{home.socialProof.founderNote}&rdquo;
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 sm:gap-6 lg:flex-col lg:justify-center">
                  {home.socialProof.stats.map((stat) => (
                    <div key={stat.label} className="min-w-[120px]">
                      <p className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-20">
          <Reveal className="max-w-4xl">
            <SectionEyebrow>{home.story.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 max-w-5xl text-2xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {home.story.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-4 sm:text-lg">
              {home.story.description}
            </p>
          </Reveal>

          <div className="mt-6 space-y-4 sm:mt-10 sm:space-y-6 lg:mt-12 lg:space-y-8">
            {home.story.scenes.map((scene, index) => {
              const Icon = storyIcons[index] ?? MessageSquareText;

              return (
                <Reveal key={scene.id} delay={index * 70}>
                  <SurfaceCard className="overflow-hidden">
                    <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
                      <div className="p-5 sm:p-8 lg:p-10">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-background sm:size-11">
                            <Icon className="size-4 text-foreground sm:size-5" />
                          </div>
                          <Badge
                            variant="outline"
                            className="border-border/60 bg-background px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                          >
                            {scene.eyebrow}
                          </Badge>
                        </div>

                        <div className="mt-5 max-w-xl sm:mt-6">
                          <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-3xl">
                            {scene.title}
                          </h3>
                          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:mt-4 sm:text-lg">
                            {scene.description}
                          </p>
                        </div>

                        <div className="mt-5 rounded-[1.35rem] border border-border/60 bg-background px-4 py-3.5 shadow-sm sm:mt-6 sm:rounded-[1.5rem] sm:px-5 sm:py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {storyProductLabel}
                          </p>
                          <p className="mt-2 text-base font-semibold leading-7 text-foreground sm:text-lg">
                            {scene.outcome}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-border/60 bg-muted/20 p-4 sm:p-6 lg:border-l lg:border-t-0 lg:p-8">
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

        {/* Dark accent band */}
        <section className="relative overflow-hidden bg-emerald-950 py-14 sm:py-20 lg:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.15)_0%,_transparent_60%)]" />
          <Reveal className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <p className="mx-auto max-w-3xl text-xl font-bold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl">
              {home.darkBand.stat}
            </p>
            <p className="mx-auto mt-4 max-w-xl text-base text-emerald-300/80 sm:text-lg">
              {home.darkBand.caption}
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="bg-white text-emerald-950 hover:bg-white/90">
                <Link href="/register">
                  {home.hero.primaryCta}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-16">
          <Reveal className="max-w-3xl">
            <SectionEyebrow>{home.audience.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              {home.audience.title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:mt-4 sm:text-lg">
              {home.audience.description}
            </p>
          </Reveal>

          <div className="mt-6 grid gap-4 sm:mt-10 lg:grid-cols-12">
            <Reveal className="lg:col-span-7">
              <SurfaceCard className="h-full p-5 sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-background sm:size-11">
                    <WalletCards className="size-4 text-foreground sm:size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {home.audience.owners.title}
                    </p>
                    <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {home.audience.owners.description}
                    </h3>
                  </div>
                </div>

                <ul className="mt-5 space-y-3 sm:mt-6">
                  {home.audience.owners.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-3 rounded-[1.25rem] border border-border/50 bg-background px-4 py-3.5 text-sm leading-6 text-muted-foreground sm:rounded-[1.5rem] sm:px-5 sm:py-4"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </SurfaceCard>
            </Reveal>

            <Reveal className="lg:col-span-5" delay={90}>
              <SurfaceCard className="h-full p-5 sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-background sm:size-11">
                    <Users2 className="size-4 text-foreground sm:size-5" />
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

                <ul className="mt-5 space-y-3 sm:mt-6">
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

          {/* Evidence — compact row merged into audience */}
          <Reveal className="mt-6 sm:mt-8">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {evidenceItems.map(({ icon: EvidenceIcon, copy }) => (
                <div
                  key={copy.title}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3.5 sm:px-5 sm:py-4"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card">
                    <EvidenceIcon className="size-3.5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{copy.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{copy.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-6 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8 lg:pb-16 lg:pt-12">
          <Reveal>
            <SurfaceCard className="p-5 sm:p-8">
              <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <SectionEyebrow>{home.final.eyebrow}</SectionEyebrow>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {home.final.title}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:mt-4 sm:text-lg">
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

      <footer className="mt-2 border-t border-slate-900 bg-slate-950 text-slate-50 sm:mt-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <BrandLockup subtitle={t.shell.subtitle} inverted />
              <p className="max-w-md text-sm leading-6 text-slate-400">
                {home.footerDescription}
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {home.footerMadeIn}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:items-end sm:text-right">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Mail className="size-4" />
                <a
                  href={`mailto:${home.footerContact}`}
                  className="transition-colors hover:text-slate-200"
                >
                  {home.footerContact}
                </a>
              </div>
              <div className="flex flex-wrap gap-3">
                {home.footerLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <p className="text-xs text-slate-600">
                &copy; {new Date().getFullYear()} KoiRaboti
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
