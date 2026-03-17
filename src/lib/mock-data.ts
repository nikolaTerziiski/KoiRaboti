import { format, startOfDay, subDays } from "date-fns";
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
    dailyRate: 110,
    isActive: true,
  },
  {
    id: "emp-2",
    fullName: "Maria Georgieva",
    role: "Server",
    phone: "+359 888 100 002",
    dailyRate: 90,
    isActive: true,
  },
  {
    id: "emp-3",
    fullName: "Nikolay Dimitrov",
    role: "Grill Cook",
    phone: "+359 888 100 003",
    dailyRate: 105,
    isActive: true,
  },
  {
    id: "emp-4",
    fullName: "Elena Stoyanova",
    role: "Barista",
    phone: "+359 888 100 004",
    dailyRate: 88,
    isActive: true,
  },
  {
    id: "emp-5",
    fullName: "Georgi Iliev",
    role: "Prep Cook",
    phone: "+359 888 100 005",
    dailyRate: 92,
    isActive: true,
  },
  {
    id: "emp-6",
    fullName: "Petya Ivanova",
    role: "Host",
    phone: "+359 888 100 006",
    dailyRate: 85,
    isActive: true,
  },
  {
    id: "emp-7",
    fullName: "Stoyan Kolev",
    role: "Delivery Desk",
    phone: "+359 888 100 007",
    dailyRate: 87,
    isActive: true,
  },
  {
    id: "emp-8",
    fullName: "Ralitsa Hristova",
    role: "Server",
    phone: "+359 888 100 008",
    dailyRate: 90,
    isActive: true,
  },
  {
    id: "emp-9",
    fullName: "Dimitar Yordanov",
    role: "Dishwasher",
    phone: "+359 888 100 009",
    dailyRate: 80,
    isActive: true,
  },
  {
    id: "emp-10",
    fullName: "Teodora Marinova",
    role: "Shift Supervisor",
    phone: "+359 888 100 010",
    dailyRate: 120,
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
    .filter((_, employeeIndex) => employeeIndex < 7 || (employeeIndex + dayIndex) % 2 === 0)
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
      };
    });
}

function buildDemoReports(referenceDate = new Date()): DailyReportWithAttendance[] {
  const today = startOfDay(referenceDate);

  return Array.from({ length: 8 }, (_, index) => {
    const date = subDays(today, index);
    const workDate = format(date, "yyyy-MM-dd");
    const id = `report-${workDate}`;
    const turnover = 4200 + (7 - index) * 180 + (index % 2 === 0 ? 90 : 0);
    const cardAmount = Math.round(turnover * (0.62 + (index % 3) * 0.03));
    const manualExpense = index === 0 ? 800 : 800 + (index % 2) * 50;
    const profit = Math.round(turnover * 0.31 - manualExpense * 0.15);

    return {
      id,
      workDate,
      turnover,
      profit,
      cardAmount,
      manualExpense,
      attendanceEntries: buildAttendanceEntries(id, index),
    };
  });
}

export function createDemoSnapshot(): RestaurantSnapshot {
  return {
    mode: "demo",
    employees: demoEmployees,
    reports: buildDemoReports(),
  };
}
