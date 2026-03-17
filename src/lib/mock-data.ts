import { format, startOfDay, subDays } from "date-fns";
import { bgnToEur, DEFAULT_MANUAL_EXPENSE_EUR } from "@/lib/format";
import type {
  AttendanceEntry,
  DailyReportWithAttendance,
  Employee,
  PayUnits,
  RestaurantSnapshot,
} from "@/lib/types";

export const demoEmployees: Employee[] = [
  {
    id: "emp-1",
    fullName: "Ivan Petrov",
    role: "Kitchen Lead",
    phone: "+359 888 100 001",
    dailyRate: bgnToEur(110),
    isActive: true,
  },
  {
    id: "emp-2",
    fullName: "Maria Georgieva",
    role: "Server",
    phone: "+359 888 100 002",
    dailyRate: bgnToEur(90),
    isActive: true,
  },
  {
    id: "emp-3",
    fullName: "Nikolay Dimitrov",
    role: "Grill Cook",
    phone: "+359 888 100 003",
    dailyRate: bgnToEur(105),
    isActive: true,
  },
  {
    id: "emp-4",
    fullName: "Elena Stoyanova",
    role: "Barista",
    phone: "+359 888 100 004",
    dailyRate: bgnToEur(88),
    isActive: true,
  },
  {
    id: "emp-5",
    fullName: "Georgi Iliev",
    role: "Prep Cook",
    phone: "+359 888 100 005",
    dailyRate: bgnToEur(92),
    isActive: true,
  },
  {
    id: "emp-6",
    fullName: "Petya Ivanova",
    role: "Host",
    phone: "+359 888 100 006",
    dailyRate: bgnToEur(85),
    isActive: true,
  },
  {
    id: "emp-7",
    fullName: "Stoyan Kolev",
    role: "Delivery Desk",
    phone: "+359 888 100 007",
    dailyRate: bgnToEur(87),
    isActive: true,
  },
  {
    id: "emp-8",
    fullName: "Ralitsa Hristova",
    role: "Server",
    phone: "+359 888 100 008",
    dailyRate: bgnToEur(90),
    isActive: true,
  },
  {
    id: "emp-9",
    fullName: "Dimitar Yordanov",
    role: "Dishwasher",
    phone: "+359 888 100 009",
    dailyRate: bgnToEur(80),
    isActive: true,
  },
  {
    id: "emp-10",
    fullName: "Teodora Marinova",
    role: "Shift Supervisor",
    phone: "+359 888 100 010",
    dailyRate: bgnToEur(120),
    isActive: true,
  },
];

function resolvePayUnits(dayIndex: number, employeeIndex: number): PayUnits {
  if ((dayIndex + employeeIndex) % 5 === 0) {
    return 2;
  }

  if ((dayIndex + employeeIndex) % 3 === 0) {
    return 1.5;
  }

  return 1;
}

function buildAttendanceEntries(
  reportId: string,
  dayIndex: number,
): AttendanceEntry[] {
  return demoEmployees
    .filter(
      (_, employeeIndex) => employeeIndex < 7 || (employeeIndex + dayIndex) % 2 === 0,
    )
    .map((employee, employeeIndex) => {
      const payUnits = resolvePayUnits(dayIndex, employeeIndex);
      const shift2 = payUnits > 1;
      const payOverride =
        employee.role === "Shift Supervisor" && dayIndex === 1
          ? employee.dailyRate * 2.25
          : null;

      return {
        id: `${reportId}-${employee.id}`,
        dailyReportId: reportId,
        employeeId: employee.id,
        shift1: true,
        shift2,
        payUnits,
        payOverride,
        notes: dayIndex === 0 && employee.role === "Kitchen Lead" ? "Late prep delivery." : null,
      };
    });
}

function buildDemoReports(referenceDate = new Date()): DailyReportWithAttendance[] {
  const today = startOfDay(referenceDate);

  return Array.from({ length: 8 }, (_, index) => {
    const date = subDays(today, index);
    const workDate = format(date, "yyyy-MM-dd");
    const id = `report-${workDate}`;
    const turnoverBgn = 4200 + (7 - index) * 180 + (index % 2 === 0 ? 90 : 0);
    const turnover = bgnToEur(turnoverBgn);
    const cardAmount = turnover * (0.62 + (index % 3) * 0.03);
    const manualExpense =
      index === 0 ? DEFAULT_MANUAL_EXPENSE_EUR : bgnToEur(800 + (index % 2) * 50);
    const profit = turnover * 0.31 - manualExpense * 0.15;

    return {
      id,
      workDate,
      turnover,
      profit,
      cardAmount,
      manualExpense,
      notes: index === 0 ? "Lunch rush was stronger than expected." : null,
      attendanceEntries: buildAttendanceEntries(id, index),
    };
  });
}

export function createDemoSnapshot(): RestaurantSnapshot {
  return {
    mode: "demo",
    employees: demoEmployees,
    reports: buildDemoReports(),
    errorMessage: null,
  };
}
