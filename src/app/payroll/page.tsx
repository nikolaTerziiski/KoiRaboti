import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PayrollPageClient } from "@/components/payroll/payroll-page-client";
import { ErrorCard } from "@/components/ui/error-card";
import { getRestaurantSnapshot } from "@/lib/supabase/data";
import { getUserRestaurantId } from "@/lib/supabase/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PayrollPayment } from "@/lib/types";

export const dynamic = "force-dynamic";

type SupabasePayrollPaymentRow = {
  id: string;
  employee_id: string;
  amount: number | string;
  payment_type: string;
  payroll_month: string;
  payroll_period: "first_half" | "second_half";
  created_at: string;
};

export default async function PayrollPage() {
  const [sessionMode, snapshot] = await Promise.all([
    getSessionMode(),
    getRestaurantSnapshot(),
  ]);

  if (sessionMode === "guest") {
    redirect("/login");
  }

  if (snapshot.errorMessage) {
    return (
      <AppShell
        pageKey="payroll"
        sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
        dataMode="error"
      >
        <ErrorCard pageKey="payroll" message={snapshot.errorMessage} />
      </AppShell>
    );
  }

  let payrollPayments: PayrollPayment[] = [];
  let payrollPaymentError: string | null = null;

  if (snapshot.mode === "supabase") {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      payrollPaymentError = "Supabase client is unavailable for payroll payments.";
    } else {
      if (!(await getUserRestaurantId(supabase))) {
        payrollPaymentError = "No restaurant found for current user.";
      } else {
        const { data, error } = await supabase
          .from("payroll_payments")
          .select("id, employee_id, amount, payment_type, payroll_month, payroll_period, created_at")
          .order("payroll_month", { ascending: false })
          .order("payroll_period", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) {
          payrollPaymentError = error.message;
        } else {
          payrollPayments = ((data ?? []) as SupabasePayrollPaymentRow[]).map((row) => ({
            id: row.id,
            employeeId: row.employee_id,
            amount: Number(row.amount),
            paymentType: row.payment_type === "advance" ? "advance" : "payroll",
            payrollMonth: row.payroll_month,
            payrollPeriod: row.payroll_period,
            createdAt: row.created_at,
          }));
        }
      }
    }
  }

  if (payrollPaymentError) {
    return (
      <AppShell
        pageKey="payroll"
        sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
        dataMode="error"
      >
        <ErrorCard pageKey="payroll" message={payrollPaymentError} />
      </AppShell>
    );
  }

  const dataMode = snapshot.errorMessage
    ? "error"
    : snapshot.mode === "supabase"
      ? "supabase"
      : "demo";

  return (
    <AppShell
      pageKey="payroll"
      sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
      dataMode={dataMode}
    >
      <PayrollPageClient
        employees={snapshot.employees}
        reports={snapshot.reports}
        payments={payrollPayments}
        dataMode={snapshot.mode}
      />
    </AppShell>
  );
}
