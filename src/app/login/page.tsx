import { redirect } from "next/navigation";
import { ClipboardList, Leaf, Wallet } from "lucide-react";
import { getSessionMode, loginAction } from "@/actions/auth";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseCredentials } from "@/lib/env";

export const dynamic = "force-dynamic";

const highlights = [
  {
    title: "Attendance first",
    description: "Track 1, 1.5, and 2 pay-unit days without extra typing.",
    icon: ClipboardList,
  },
  {
    title: "Daily numbers",
    description: "Capture turnover, profit, card totals, and manual expense in one pass.",
    icon: Wallet,
  },
  {
    title: "Green from day one",
    description: "Set up clean mobile-ready tokens now and leave deep polish for later.",
    icon: Leaf,
  },
];

export default async function LoginPage() {
  const sessionMode = await getSessionMode();
  if (sessionMode !== "guest") {
    redirect("/today");
  }

  const usesSupabase = hasSupabaseCredentials();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8 sm:max-w-4xl sm:px-6">
      <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-gradient-to-br from-primary to-[#176b38] text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-3xl">KoiRaboti</CardTitle>
            <CardDescription className="max-w-sm text-primary-foreground/80">
              Mobile-first restaurant control for attendance, daily finance, and split payroll periods.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/12 bg-white/10 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-white/12">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-primary-foreground/80">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              {usesSupabase
                ? "Use your Supabase admin credentials."
                : "Supabase keys are optional for first run. Any email and password will open demo mode."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginForm action={loginAction} usesSupabase={usesSupabase} />
            <div className="rounded-2xl bg-secondary/35 p-4 text-sm text-muted-foreground">
              The app redirects to `/today` after sign-in and exposes the rest of the internal tools from the bottom navigation.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
