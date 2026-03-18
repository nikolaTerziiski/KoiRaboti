export type PayUnits = 1 | 1.5 | 2;
export type SnapshotMode = "demo" | "supabase";
export type SessionMode = "guest" | "demo" | "supabase";
export type PayrollPeriod = "first_half" | "second_half";
export type EmployeeRole = "kitchen" | "service";
export type PayrollPaymentType = "advance" | "payroll";

export interface Restaurant {
  id: string;
  name: string;
  defaultDailyExpense: number;
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

export interface PayrollPayment {
  id: string;
  employeeId: string;
  amount: number;
  paymentType: PayrollPaymentType;
  payrollMonth: string;
  payrollPeriod: PayrollPeriod;
  createdAt: string;
}

export interface DailyReportWithAttendance extends DailyReport {
  attendanceEntries: AttendanceEntry[];
}

export interface RestaurantSnapshot {
  mode: SnapshotMode;
  restaurant: Restaurant | null;
  profile: Profile | null;
  employees: Employee[];
  reports: DailyReportWithAttendance[];
  errorMessage: string | null;
}


