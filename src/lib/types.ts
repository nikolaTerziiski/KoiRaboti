export type PayUnits = 1 | 1.5 | 2;
export type SnapshotMode = "demo" | "supabase";
export type SessionMode = "guest" | "demo" | "supabase";
export type EmployeeRole = "kitchen" | "service";
export type PayrollPaymentType = "advance" | "payroll";
export type EmployeePaymentSchedule =
  | "twice_monthly"
  | "weekly"
  | "monthly"
  | "on_demand";
export type PayrollCadence =
  | "daily"
  | "weekly"
  | "twice_monthly"
  | "monthly";
export type ExpenseSourceType = "web" | "telegram";

export interface PayrollWindow {
  startDate: string;
  endDate: string;
}

export interface Restaurant {
  id: string;
  name: string;
  defaultDailyExpense: number;
  defaultPayrollCadence: PayrollCadence;
  defaultWeeklyPayday: number | null;
  defaultMonthlyPayDay: number | null;
  defaultTwiceMonthlyDay1: number | null;
  defaultTwiceMonthlyDay2: number | null;
}

export interface Profile {
  id: string;
  restaurantId: string;
  fullName: string;
  email: string;
}

export interface Employee {
  id: string;
  restaurantId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: EmployeeRole;
  phoneNumber: string | null;
  dailyRate: number;
  isActive: boolean;
  useRestaurantPayrollDefaults: boolean;
  payrollCadence: PayrollCadence | null;
  weeklyPayday: number | null;
  monthlyPayDay: number | null;
  twiceMonthlyDay1: number | null;
  twiceMonthlyDay2: number | null;
  paymentSchedule?: EmployeePaymentSchedule;
  paymentDay1?: number;
  paymentDay2?: number;
  paymentWeekday?: number;
  balanceStartsFrom?: string;
}

export interface DailyReport {
  id: string;
  workDate: string;
  turnover: number;
  profit: number;
  cardAmount: number;
  manualExpense: number;
  notes: string | null;
}

export interface AttendanceEntry {
  id: string;
  dailyReportId: string;
  employeeId: string;
  dailyRate: number;
  payUnits: PayUnits;
  payOverride: number | null;
  notes: string | null;
}

export interface EmployeeAttendanceEntry extends AttendanceEntry {
  workDate: string;
}

export interface PayrollPayment {
  id: string;
  employeeId: string;
  amount: number;
  paymentType: PayrollPaymentType;
  periodStart: string | null;
  periodEnd: string | null;
  paidOn: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  restaurantId: string;
  name: string;
  emoji: string | null;
  isActive: boolean;
}

export interface DailyExpenseItem {
  id: string;
  dailyReportId: string;
  categoryId: string | null;
  amount: number;
  amountOriginal: number | null;
  currencyOriginal: string | null;
  description: string | null;
  receiptImagePath: string | null;
  receiptOcrText: string | null;
  sourceType: ExpenseSourceType;
  telegramUserId: string | null;
  categoryName: string | null;
  categoryEmoji: string | null;
  createdAt: string | null;
}

export interface DailyReportWithAttendance extends DailyReport {
  attendanceEntries: AttendanceEntry[];
  expenseItems: DailyExpenseItem[];
}

export interface RestaurantSnapshot {
  mode: SnapshotMode;
  restaurant: Restaurant | null;
  profile: Profile | null;
  employees: Employee[];
  reports: DailyReportWithAttendance[];
  expenseCategories: ExpenseCategory[];
  errorMessage: string | null;
}

