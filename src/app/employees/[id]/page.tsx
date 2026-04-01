import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { EmployeeTimesheetClient } from "@/components/employees/employee-timesheet-client";
import { ErrorCard } from "@/components/ui/error-card";
import { demoPayrollPayments } from "@/lib/mock-data";
import { getRestaurantSnapshot, getUserRestaurantId } from "@/lib/supabase/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EmployeeAttendanceEntry, PayrollPayment } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Employee Timesheet - KoiRaboti" };

type EmployeeTimesheetPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type SupabasePayrollPaymentRow = {
  id: string;
  employee_id: string;
  amount: number | string;
  payment_type: string;
  paid_on: string | null;
  created_at: string;
};

export default async function EmployeeTimesheetPage({
  params,
}: EmployeeTimesheetPageProps) {
  const { id } = await params;
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
        pageKey="employees"
        sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
        dataMode="error"
      >
        <ErrorCard pageKey="employees" message={snapshot.errorMessage} />
      </AppShell>
    );
  }

  const employee = snapshot.employees.find((item) => item.id === id);
  if (!employee) {
    redirect("/employees");
  }

  const attendanceEntries: EmployeeAttendanceEntry[] = snapshot.reports.flatMap((report) =>
    report.attendanceEntries
      .filter((entry) => entry.employeeId === employee.id)
      .map((entry) => ({
        ...entry,
        workDate: report.workDate,
      })),
  );

  let payrollPayments: PayrollPayment[] =
    snapshot.mode === "demo"
      ? demoPayrollPayments.filter((payment) => payment.employeeId === employee.id)
      : [];
  let payrollPaymentError: string | null = null;

  if (snapshot.mode === "supabase") {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      payrollPaymentError = "Supabase client is unavailable for payroll payments.";
    } else if (!(await getUserRestaurantId(supabase))) {
      payrollPaymentError = "No restaurant found for current user.";
    } else {
      const { data, error } = await supabase
        .from("payroll_payments")
        .select("id, employee_id, amount, payment_type, paid_on, created_at")
        .eq("employee_id", employee.id)
        .order("paid_on", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        payrollPaymentError = error.message;
      } else {
        payrollPayments = ((data ?? []) as SupabasePayrollPaymentRow[]).map((row) => ({
          id: row.id,
          employeeId: row.employee_id,
          amount: Number(row.amount),
          paymentType: row.payment_type === "advance" ? "advance" : "payroll",
          periodStart: null,
          periodEnd: null,
          paidOn: row.paid_on ?? row.created_at.slice(0, 10),
          createdAt: row.created_at,
        }));
      }
    }
  }

  if (payrollPaymentError) {
    return (
      <AppShell
        pageKey="employees"
        sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
        dataMode="error"
      >
        <ErrorCard pageKey="employees" message={payrollPaymentError} />
      </AppShell>
    );
  }

  return (
    <AppShell
      pageKey="employees"
      sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
      dataMode={snapshot.mode}
      pageTitle={employee.fullName}
    >
      <EmployeeTimesheetClient
        employee={employee}
        attendanceEntries={attendanceEntries}
        payments={payrollPayments}
      />
    </AppShell>
  );
}
