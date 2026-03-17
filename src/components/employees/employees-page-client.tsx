"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import type { Employee, SnapshotMode } from "@/lib/types";

type EmployeesPageClientProps = {
  initialEmployees: Employee[];
  dataMode: SnapshotMode;
};

export function EmployeesPageClient({
  initialEmployees,
  dataMode,
}: EmployeesPageClientProps) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [draft, setDraft] = useState({
    fullName: "",
    role: "",
    dailyRate: "",
  });

  const activeEmployees = employees.filter((employee) => employee.isActive);
  const averageRate =
    activeEmployees.reduce((sum, employee) => sum + employee.dailyRate, 0) /
      (activeEmployees.length || 1);
  const highestRate = activeEmployees.reduce(
    (highest, employee) => Math.max(highest, employee.dailyRate),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Active team
            </p>
            <p className="mt-2 text-2xl font-semibold">{activeEmployees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Avg daily rate
            </p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(averageRate)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add employee</CardTitle>
          <CardDescription>
            Keep the wage setup explicit. Bonuses and deductions stay out of MVP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={draft.fullName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, fullName: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={draft.role}
              onChange={(event) =>
                setDraft((current) => ({ ...current, role: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dailyRate">Daily rate</Label>
            <Input
              id="dailyRate"
              inputMode="decimal"
              value={draft.dailyRate}
              onChange={(event) =>
                setDraft((current) => ({ ...current, dailyRate: event.target.value }))
              }
            />
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              const dailyRate = Number(draft.dailyRate);
              if (!draft.fullName.trim() || !draft.role.trim() || !Number.isFinite(dailyRate)) {
                return;
              }

              setEmployees((current) => [
                {
                  id: `draft-${current.length + 1}`,
                  fullName: draft.fullName.trim(),
                  role: draft.role.trim(),
                  dailyRate,
                  isActive: true,
                  phone: null,
                },
                ...current,
              ]);
              setDraft({
                fullName: "",
                role: "",
                dailyRate: "",
              });
            }}
          >
            <Plus className="size-4" />
            Add to roster
          </Button>
          <p className="text-sm text-muted-foreground">
            {dataMode === "demo"
              ? "Draft changes stay in the page until Supabase is connected."
              : "Live Supabase data is shown above; this draft form is ready for a future insert action."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee roster</CardTitle>
          <CardDescription>
            Highest current daily rate: {formatCurrency(highestRate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="rounded-3xl border border-border/70 bg-secondary/25 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{employee.fullName}</p>
                  <p className="text-sm text-muted-foreground">{employee.role}</p>
                </div>
                <Badge variant={employee.isActive ? "success" : "outline"}>
                  {employee.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-card px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="size-4" />
                  Daily rate
                </div>
                <p className="font-semibold">{formatCurrency(employee.dailyRate)}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    setEmployees((current) =>
                      current.map((item) =>
                        item.id === employee.id
                          ? { ...item, isActive: !item.isActive }
                          : item,
                      ),
                    )
                  }
                >
                  {employee.isActive ? "Mark inactive" : "Reactivate"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
