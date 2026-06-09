"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { SystemSelect } from "@/components/workspace/system-select";
import { getTodayInAppTimezone } from "@/lib/app-dates";

function shiftMonth(month: string, offset: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + offset, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");

  return `${nextYear}-${nextMonth}`;
}

function formatMonthLabel(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function buildMonthOptions(activeMonth: string) {
  const currentMonth = getTodayInAppTimezone().slice(0, 7);
  const months = Array.from({ length: 13 }, (_, index) =>
    shiftMonth(currentMonth, -index),
  );

  if (!months.includes(activeMonth)) {
    months.unshift(activeMonth);
  }

  return months.map((month) => ({
    label: formatMonthLabel(month),
    value: month,
  }));
}

export function MetasMonthFilter({ month }: { month: string }) {
  const router = useRouter();
  const options = useMemo(() => buildMonthOptions(month), [month]);

  return (
    <div className="w-[220px] max-w-full">
      <SystemSelect
        align="end"
        ariaLabel="Selecionar mês das metas"
        displayLabel="Mês"
        onValueChange={(nextMonth) => router.push(`/metas?mes=${nextMonth}`)}
        options={options}
        selectedLabel={formatMonthLabel(month)}
        triggerClassName="h-10 rounded-[12px] lg:h-9"
        value={month}
      />
    </div>
  );
}
