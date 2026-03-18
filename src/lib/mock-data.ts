import { format, startOfDay, subDays } from "date-fns";
import { bgnToEur, DEFAULT_MANUAL_EXPENSE_EUR } from "@/lib/format";
import type {
  AttendanceEntry,
  DailyReportWithAttendance,
  Employee,
  Restaurant,
  RestaurantSnapshot,
} from "@/lib/types";

const DEMO_RESTAURANT_ID = "demo-restaurant-1";

export const demoRestaurant: Restaurant = {
  id: DEMO_RESTAURANT_ID,
  name: "Demo Restaurant",
  defaultDailyExpense: DEFAULT_MANUAL_EXPENSE_EUR,
};

export const demoEmployees: Employee[] = [
  {
    id: "emp-1",
    restaurantId: DEMO_RESTAURANT_ID,
    firstName: "Ivan",
    lastName: "Petrov",
    fullName: "Ivan Petrov",
    role: "kitchen",
    phoneNumber: "+359 888 100 001",
    dailyRate: bgnToEur(110),
    isActive: true,
  },
  {
    id: "emp-2",
    restaurantId: DEMO_RESTAURANT_ID,
    firstName: "Maria",
    lastName: "Georgieva",
    fullName: "Maria Georgieva",
    role: "service",
    phoneNumber: "+359 888 100 002",
    dailyRate: bgnToEur(90),
    isActive: true,
  },
  {
    id: "emp-3",
    restaurantId: DEMO_RESTAURANT_ID,
    firstName: "Nikolay",
    lastName: "Dimitrov",
    fullName: "Nikolay Dimitrov",
    role: "kitchen",
    phoneNumber: "+359 888 100 003",
    dailyRate: bgnToEur(105),
    isActive: true,
  },
  {
    id: "emp-4",
    restaurantId: DEMO_RESTAURANT_ID,
    firstName: "Elena",
    lastName: "Stoyanova",
    fullName: "Elena Stoyanova",
    role: "service",
    phoneNumber: "+359 888 100 004",
    dailyRate: bgnToEur(88),
    isActive: true,
  },
  {
    id: "emp-5",
    restaurantId: DEMO_RESTAURANT_ID,
    firstName: "Georgi",
    lastName: "Iliev",
    fullName: "Georgi Iliev",
    role: "kitchen",
    phoneNumber: "+359 888 100 005",
    dailyRate: bgnToEur(92),
    isActive: true,
  },
  {
    id: "emp-6",
    restaurantId: DEMO_RESTAURANT_ID,
    firstName: "Petya",
    lastName: "Ivanova",
    fullName: "Petya Ivanova",
    role: "service",
    phoneNumber: null,
    dailyRate: bgnToEur(85),
    isActive: true,
  },
  {
    id: "emp-7",
    restaurantId: DEMO_RESTAURANT_ID,
    firstName: "Stoyan",
    lastName: "Kolev",
    fullName: "Stoyan Kolev",
    role: "kitchen",
    phoneNumber: null,
    dailyRate: bgnToEur(87),
    isActive: true,
  },
  {
    id: "emp-8",
    restaurantId: DEMO_RESTAURANT_ID,
    firstName: "Ralitsa",
    lastName: "Hristova",
    fullName: "Ralitsa Hristova",
    role: "service",
    phoneNumber: "+359 888 100 008",
    dailyRate: bgnToEur(90),
    isActive: true,
  },
  {
    id: "emp-9",
    restaurantId: DEMO_RESTAURANT_ID,
    firstName: "Dimitar",
    lastName: "Yordanov",
    fullName: "Dimitar Yordanov",
    role: "service",
    phoneNumber: null,
    dailyRate: bgnToEur(80),
    isActive: true,
  },
  {
    id: "emp-10",
    restaurantId: DEMO_RESTAURANT_ID,
    firstName: "Teodora",
    lastName: "Marinova",
    fullName: "Teodora Marinova",
    role: "kitchen",
    phoneNumber: "+359 888 100 010",
    dailyRate: bgnToEur(120),
    isActive: true,
  },
];

function resolvePayUnits(dayIndex: number, employeeIndex: number): 1 | 1.5 | 2 {
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
      const payOverride =
        employee.id === "emp-10" && dayIndex === 1
          ? employee.dailyRate * 2.25
          : null;

      return {
        id: `${reportId}-${employee.id}`,
        dailyReportId: reportId,
        employeeId: employee.id,
        payUnits,
        payOverride,
        notes: dayIndex === 0 && employee.id === "emp-1" ? "Late prep delivery." : null,
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
    restaurant: demoRestaurant,
    employees: demoEmployees,
    reports: buildDemoReports(),
    errorMessage: null,
  };
}

