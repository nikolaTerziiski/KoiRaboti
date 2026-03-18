import type { DailyReportWithAttendance } from "@/lib/types";

function escapeCsvCell(value: string) {
  if (/["\n\r,]/.test(value) || /^\s|\s$/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function formatCsvNumber(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 10000) / 10000;
  const asString = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(4);

  return asString.includes(".") ? asString.replace(/0+$/, "").replace(/\.$/, "") : asString;
}

function buildReportsCsvRows(reports: DailyReportWithAttendance[]) {
  const rows = [["Дата", "Оборот", "Печалба", "Платено с Карта", "Разходи", "Чиста Печалба"]];

  let totalTurnover = 0;
  let totalProfit = 0;
  let totalCard = 0;
  let totalExpense = 0;
  let totalNetProfit = 0;

  for (const report of reports) {
    const netProfit = report.profit - report.manualExpense;

    totalTurnover += report.turnover;
    totalProfit += report.profit;
    totalCard += report.cardAmount;
    totalExpense += report.manualExpense;
    totalNetProfit += netProfit;

    rows.push([
      report.workDate,
      formatCsvNumber(report.turnover),
      formatCsvNumber(report.profit),
      formatCsvNumber(report.cardAmount),
      formatCsvNumber(report.manualExpense),
      formatCsvNumber(netProfit),
    ]);
  }

  rows.push([
    "TOTAL",
    formatCsvNumber(totalTurnover),
    formatCsvNumber(totalProfit),
    formatCsvNumber(totalCard),
    formatCsvNumber(totalExpense),
    formatCsvNumber(totalNetProfit),
  ]);

  return rows;
}

export function buildReportsCsvContent(reports: DailyReportWithAttendance[]) {
  const rows = buildReportsCsvRows(reports);
  const csv = rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");

  return `\uFEFF${csv}`;
}

export function exportReportsToCSV(
  reports: DailyReportWithAttendance[],
  monthLabel: string,
) {
  const csvContent = buildReportsCsvContent(reports);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const sanitizedMonthLabel = monthLabel.trim().replace(/\s+/g, "-") || "month";

  link.href = objectUrl;
  link.download = `otsheti-${sanitizedMonthLabel}.csv`;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
