import type { Employee, PayrollCadence, Restaurant } from "@/lib/types";

export type PayrollCadenceFormDraft = {
  cadence: PayrollCadence;
  weeklyPayday: string;
  monthlyPayDay: string;
  twiceMonthlyDay1: string;
  twiceMonthlyDay2: string;
};

type PayrollCadenceInput = {
  cadence: string;
  weeklyPayday?: FormDataEntryValue | null;
  monthlyPayDay?: FormDataEntryValue | null;
  twiceMonthlyDay1?: FormDataEntryValue | null;
  twiceMonthlyDay2?: FormDataEntryValue | null;
};

function parseIntegerInRange(
  value: FormDataEntryValue | null | undefined,
  fieldName: string,
  min: number,
  max: number,
) {
  const normalized = String(value ?? "").trim();
  const parsed = Number(normalized);

  if (!normalized || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}.`);
  }

  return parsed;
}

function normalizeCadence(value: string): PayrollCadence {
  if (
    value === "daily" ||
    value === "weekly" ||
    value === "twice_monthly" ||
    value === "monthly"
  ) {
    return value;
  }

  throw new Error("Payroll cadence is invalid.");
}

export function createDefaultPayrollCadenceDraft(): PayrollCadenceFormDraft {
  return {
    cadence: "monthly",
    weeklyPayday: "5",
    monthlyPayDay: "1",
    twiceMonthlyDay1: "15",
    twiceMonthlyDay2: "30",
  };
}

export function buildRestaurantPayrollDraft(
  restaurant: Pick<
    Restaurant,
    | "defaultPayrollCadence"
    | "defaultWeeklyPayday"
    | "defaultMonthlyPayDay"
    | "defaultTwiceMonthlyDay1"
    | "defaultTwiceMonthlyDay2"
  > | null,
): PayrollCadenceFormDraft {
  const fallback = createDefaultPayrollCadenceDraft();

  if (!restaurant) {
    return fallback;
  }

  return {
    cadence: restaurant.defaultPayrollCadence,
    weeklyPayday: String(restaurant.defaultWeeklyPayday ?? fallback.weeklyPayday),
    monthlyPayDay: String(
      restaurant.defaultMonthlyPayDay ?? fallback.monthlyPayDay,
    ),
    twiceMonthlyDay1: String(
      restaurant.defaultTwiceMonthlyDay1 ?? fallback.twiceMonthlyDay1,
    ),
    twiceMonthlyDay2: String(
      restaurant.defaultTwiceMonthlyDay2 ?? fallback.twiceMonthlyDay2,
    ),
  };
}

export function buildEmployeePayrollDraft(
  employee: Pick<
    Employee,
    | "useRestaurantPayrollDefaults"
    | "payrollCadence"
    | "weeklyPayday"
    | "monthlyPayDay"
    | "twiceMonthlyDay1"
    | "twiceMonthlyDay2"
  >,
  restaurant: Pick<
    Restaurant,
    | "defaultPayrollCadence"
    | "defaultWeeklyPayday"
    | "defaultMonthlyPayDay"
    | "defaultTwiceMonthlyDay1"
    | "defaultTwiceMonthlyDay2"
  > | null,
) {
  const restaurantDraft = buildRestaurantPayrollDraft(restaurant);

  return {
    useRestaurantPayrollDefaults: employee.useRestaurantPayrollDefaults,
    cadenceDraft: employee.useRestaurantPayrollDefaults
      ? restaurantDraft
      : {
          cadence: employee.payrollCadence ?? restaurantDraft.cadence,
          weeklyPayday: String(
            employee.weeklyPayday ?? restaurantDraft.weeklyPayday,
          ),
          monthlyPayDay: String(
            employee.monthlyPayDay ?? restaurantDraft.monthlyPayDay,
          ),
          twiceMonthlyDay1: String(
            employee.twiceMonthlyDay1 ?? restaurantDraft.twiceMonthlyDay1,
          ),
          twiceMonthlyDay2: String(
            employee.twiceMonthlyDay2 ?? restaurantDraft.twiceMonthlyDay2,
          ),
        },
  };
}

export function parseRestaurantPayrollSettings(input: PayrollCadenceInput) {
  const cadence = normalizeCadence(input.cadence);

  if (cadence === "daily") {
    return {
      defaultPayrollCadence: cadence,
      defaultWeeklyPayday: null,
      defaultMonthlyPayDay: null,
      defaultTwiceMonthlyDay1: null,
      defaultTwiceMonthlyDay2: null,
    };
  }

  if (cadence === "weekly") {
    return {
      defaultPayrollCadence: cadence,
      defaultWeeklyPayday: parseIntegerInRange(
        input.weeklyPayday,
        "Weekly payday",
        1,
        7,
      ),
      defaultMonthlyPayDay: null,
      defaultTwiceMonthlyDay1: null,
      defaultTwiceMonthlyDay2: null,
    };
  }

  if (cadence === "monthly") {
    return {
      defaultPayrollCadence: cadence,
      defaultWeeklyPayday: null,
      defaultMonthlyPayDay: parseIntegerInRange(
        input.monthlyPayDay,
        "Monthly pay day",
        1,
        31,
      ),
      defaultTwiceMonthlyDay1: null,
      defaultTwiceMonthlyDay2: null,
    };
  }

  const firstDay = parseIntegerInRange(
    input.twiceMonthlyDay1,
    "First twice-monthly day",
    1,
    31,
  );
  const secondDay = parseIntegerInRange(
    input.twiceMonthlyDay2,
    "Second twice-monthly day",
    1,
    31,
  );

  if (firstDay === secondDay) {
    throw new Error("Twice-monthly payroll days must be different.");
  }

  return {
    defaultPayrollCadence: cadence,
    defaultWeeklyPayday: null,
    defaultMonthlyPayDay: null,
    defaultTwiceMonthlyDay1: firstDay,
    defaultTwiceMonthlyDay2: secondDay,
  };
}

export function parseEmployeePayrollSettings(input: {
  useRestaurantPayrollDefaults: boolean;
  cadence: string;
  weeklyPayday?: FormDataEntryValue | null;
  monthlyPayDay?: FormDataEntryValue | null;
  twiceMonthlyDay1?: FormDataEntryValue | null;
  twiceMonthlyDay2?: FormDataEntryValue | null;
}) {
  if (input.useRestaurantPayrollDefaults) {
    return {
      useRestaurantPayrollDefaults: true,
      payrollCadence: null,
      weeklyPayday: null,
      monthlyPayDay: null,
      twiceMonthlyDay1: null,
      twiceMonthlyDay2: null,
    };
  }

  const cadence = normalizeCadence(input.cadence);

  if (cadence === "daily") {
    return {
      useRestaurantPayrollDefaults: false,
      payrollCadence: cadence,
      weeklyPayday: null,
      monthlyPayDay: null,
      twiceMonthlyDay1: null,
      twiceMonthlyDay2: null,
    };
  }

  if (cadence === "weekly") {
    return {
      useRestaurantPayrollDefaults: false,
      payrollCadence: cadence,
      weeklyPayday: parseIntegerInRange(
        input.weeklyPayday,
        "Weekly payday",
        1,
        7,
      ),
      monthlyPayDay: null,
      twiceMonthlyDay1: null,
      twiceMonthlyDay2: null,
    };
  }

  if (cadence === "monthly") {
    return {
      useRestaurantPayrollDefaults: false,
      payrollCadence: cadence,
      weeklyPayday: null,
      monthlyPayDay: parseIntegerInRange(
        input.monthlyPayDay,
        "Monthly pay day",
        1,
        31,
      ),
      twiceMonthlyDay1: null,
      twiceMonthlyDay2: null,
    };
  }

  const firstDay = parseIntegerInRange(
    input.twiceMonthlyDay1,
    "First twice-monthly day",
    1,
    31,
  );
  const secondDay = parseIntegerInRange(
    input.twiceMonthlyDay2,
    "Second twice-monthly day",
    1,
    31,
  );

  if (firstDay === secondDay) {
    throw new Error("Twice-monthly payroll days must be different.");
  }

  return {
    useRestaurantPayrollDefaults: false,
    payrollCadence: cadence,
    weeklyPayday: null,
    monthlyPayDay: null,
    twiceMonthlyDay1: firstDay,
    twiceMonthlyDay2: secondDay,
  };
}
