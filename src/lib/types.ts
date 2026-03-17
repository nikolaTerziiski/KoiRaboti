export type PayUnits = 1 | 1.5 | 2;
export type SnapshotMode = "demo" | "supabase";
export type SessionMode = "guest" | "demo" | "supabase";
export type PayrollPeriod = "first_half" | "second_half";

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
  /** Computed as `firstName + ' ' + lastName` — used by all display components. */
  fullName: string;
  phoneNumber: string;
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
  shift1: boolean;
  shift2: boolean;
  payUnits: PayUnits;
  payOverride: number | null;
  notes: string | null;
}

export interface DailyReportWithAttendance extends DailyReport {
  attendanceEntries: AttendanceEntry[];
}

export interface RestaurantSnapshot {
  mode: SnapshotMode;
  restaurant: Restaurant | null;
  employees: Employee[];
  reports: DailyReportWithAttendance[];
  errorMessage: string | null;
}
