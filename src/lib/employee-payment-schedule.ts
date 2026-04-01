export type EmployeePaymentSchedule =
  | "twice_monthly"
  | "weekly"
  | "monthly"
  | "on_demand";

export const DEFAULT_PAYMENT_SCHEDULE: EmployeePaymentSchedule = "twice_monthly";
export const DEFAULT_PAYMENT_DAY_1 = 1;
export const DEFAULT_PAYMENT_DAY_2 = 16;
export const DEFAULT_PAYMENT_WEEKDAY = 1;

export type EmployeePaymentScheduleConfig = {
  paymentSchedule: EmployeePaymentSchedule;
  paymentDay1: number;
  paymentDay2: number;
  paymentWeekday: number;
  balanceStartsFrom: string;
};

type EmployeePaymentSource = {
  paymentSchedule?: string | null;
  paymentDay1?: number | string | null;
  paymentDay2?: number | string | null;
  paymentWeekday?: number | string | null;
  balanceStartsFrom?: string | null;
  payrollCadence?: string | null;
  weeklyPayday?: number | string | null;
  monthlyPayDay?: number | string | null;
  twiceMonthlyDay1?: number | string | null;
  twiceMonthlyDay2?: number | string | null;
};

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.trunc(value), min), max);
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeDistinctDays(
  firstValue: number | string | null | undefined,
  secondValue: number | string | null | undefined,
) {
  const first = clampInteger(
    toNumber(firstValue) ?? DEFAULT_PAYMENT_DAY_1,
    1,
    28,
  );
  let second = clampInteger(
    toNumber(secondValue) ?? DEFAULT_PAYMENT_DAY_2,
    1,
    28,
  );

  if (first === second) {
    second = first === 28 ? 27 : first + 1;
  }

  return first < second ? [first, second] : [second, first];
}

function normalizeWeekday(value: number | string | null | undefined) {
  return clampInteger(
    toNumber(value) ?? DEFAULT_PAYMENT_WEEKDAY,
    1,
    7,
  );
}

function normalizeDateKey(value: string | null | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return todayDateKey();
}

export function coerceEmployeePaymentSchedule(
  value: string | null | undefined,
): EmployeePaymentSchedule {
  if (
    value === "weekly" ||
    value === "monthly" ||
    value === "on_demand" ||
    value === "twice_monthly"
  ) {
    return value;
  }

  return DEFAULT_PAYMENT_SCHEDULE;
}

export function normalizeEmployeePaymentConfig(
  source: EmployeePaymentSource,
): EmployeePaymentScheduleConfig {
  const legacySchedule =
    source.payrollCadence === "weekly" ||
    source.payrollCadence === "monthly" ||
    source.payrollCadence === "twice_monthly"
      ? source.payrollCadence
      : source.payrollCadence === "daily"
        ? "on_demand"
        : null;
  const paymentSchedule = coerceEmployeePaymentSchedule(
    source.paymentSchedule ?? legacySchedule,
  );
  const [paymentDay1, paymentDay2] = normalizeDistinctDays(
    source.paymentDay1 ??
      (paymentSchedule === "monthly"
        ? source.monthlyPayDay
        : source.twiceMonthlyDay1),
    source.paymentDay2 ?? source.twiceMonthlyDay2,
  );

  return {
    paymentSchedule,
    paymentDay1,
    paymentDay2,
    paymentWeekday: normalizeWeekday(
      source.paymentWeekday ?? source.weeklyPayday,
    ),
    balanceStartsFrom: normalizeDateKey(source.balanceStartsFrom),
  };
}

export function parseEmployeePaymentScheduleInput(input: {
  paymentSchedule: FormDataEntryValue | string | null;
  paymentDay1: FormDataEntryValue | null;
  paymentDay2: FormDataEntryValue | null;
  paymentWeekday: FormDataEntryValue | null;
  balanceStartsFrom?: FormDataEntryValue | null;
}) {
  return normalizeEmployeePaymentConfig({
    paymentSchedule:
      typeof input.paymentSchedule === "string"
        ? input.paymentSchedule
        : String(input.paymentSchedule ?? ""),
    paymentDay1:
      input.paymentDay1 == null ? null : String(input.paymentDay1),
    paymentDay2:
      input.paymentDay2 == null ? null : String(input.paymentDay2),
    paymentWeekday:
      input.paymentWeekday == null ? null : String(input.paymentWeekday),
    balanceStartsFrom:
      input.balanceStartsFrom == null ? null : String(input.balanceStartsFrom),
  });
}
