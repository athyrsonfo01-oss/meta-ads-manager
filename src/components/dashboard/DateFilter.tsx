"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";

const PERIODS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7d", label: "7 dias" },
  { value: "last_14d", label: "14 dias" },
  { value: "last_30d", label: "30 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
];

export function DateFilter({
  current,
  since,
  until,
}: {
  current: string;
  since?: string;
  until?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isCustom = !!since && !!until;
  const [showCustom, setShowCustom] = useState(isCustom);
  const [fromDate, setFromDate] = useState(since ?? "");
  const [toDate, setToDate] = useState(until ?? "");

  function handlePreset(value: string) {
    setShowCustom(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    params.delete("since");
    params.delete("until");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleCustomApply() {
    if (!fromDate || !toDate) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period");
    params.set("since", fromDate);
    params.set("until", toDate);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2 w-full md:w-auto">
      <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1 overflow-x-auto">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={`px-2.5 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              !isCustom && current === p.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
            isCustom || showCustom
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Personalizado</span>
        </button>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-center gap-2 bg-secondary/50 rounded-lg p-1.5">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-card border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-card border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleCustomApply}
            disabled={!fromDate || !toDate}
            className="px-3 py-1 rounded-md text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
