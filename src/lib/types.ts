export type PayUnits = 1 | 1.5 | 2;
export type SnapshotMode = "demo" | "supabase";
export type SessionMode = "guest" | "demo" | "supabase";
export type PayrollPeriod = "first_half" | "second_half";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: "admin";
}

export interface Employee {
  id: string;
  fullName: string;
  role: string;
  phone?: string | null;
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
}

export interface AttendanceEntry {
  id: string;
  dailyReportId: string;
  employeeId: string;
  shift1: boolean;
  shift2: boolean;
  payUnits: PayUnits;
  payOverride: number | null;
}

export interface DailyReportWithAttendance extends DailyReport {
  attendanceEntries: AttendanceEntry[];
}

export interface RestaurantSnapshot {
  mode: SnapshotMode;
  employees: Employee[];
  reports: DailyReportWithAttendance[];
}
