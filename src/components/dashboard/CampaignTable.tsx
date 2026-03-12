"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  leads: number;
  mqls: number;
  cpl: number;
  cpmql: number;
  lpConversionRate: number;
  connectRate: number;
  realLeads?: number;
  realMqls?: number;
  realCpl?: number;
  realCpmql?: number;
}

interface CampaignTableProps {
  campaigns: CampaignRow[];
}

type SortKey = keyof CampaignRow;

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "success" | "warning" | "error" | "secondary"> = {
    ACTIVE: "success",
    PAUSED: "warning",
    DELETED: "error",
    ARCHIVED: "secondary",
  };
  return (
    <Badge variant={variants[status] ?? "secondary"} className="text-xs">
      {status === "ACTIVE" ? "Ativo" : status === "PAUSED" ? "Pausado" : status}
    </Badge>
  );
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const hasRealData = campaigns.some((c) => (c.realLeads ?? 0) > 0 || (c.realMqls ?? 0) > 0);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...campaigns].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  }

  type ColDef = { key: SortKey; label: string; group?: "real"; format: (v: CampaignRow) => React.ReactNode };

  const baseCols: ColDef[] = [
    { key: "name", label: "Campanha", format: (r) => r.name },
    { key: "status", label: "Status", format: (r) => r.status },
    { key: "spend", label: "Investimento", format: (r) => formatCurrency(r.spend) },
    { key: "impressions", label: "Impressões", format: (r) => formatNumber(r.impressions) },
    { key: "clicks", label: "Cliques", format: (r) => formatNumber(r.clicks) },
    { key: "ctr", label: "CTR", format: (r) => formatPercent(r.ctr) },
    { key: "cpm", label: "CPM", format: (r) => formatCurrency(r.cpm) },
    { key: "cpc", label: "CPC", format: (r) => formatCurrency(r.cpc) },
    { key: "leads", label: "Leads (Meta)", format: (r) => formatNumber(r.leads) },
    { key: "cpl", label: "CPL (Meta)", format: (r) => r.leads > 0 ? formatCurrency(r.cpl) : "-" },
    { key: "mqls", label: "MQLs (Meta)", format: (r) => formatNumber(r.mqls) },
    { key: "cpmql", label: "CPMQL (Meta)", format: (r) => r.mqls > 0 ? formatCurrency(r.cpmql) : "-" },
    { key: "lpConversionRate", label: "Conv. LP", format: (r) => formatPercent(r.lpConversionRate) },
    { key: "connectRate", label: "Connect Rate", format: (r) => formatPercent(r.connectRate) },
  ];

  const realCols: ColDef[] = hasRealData ? [
    { key: "realLeads", label: "Leads Reais", group: "real", format: (r) => formatNumber(r.realLeads ?? 0) },
    { key: "realCpl", label: "CPL Real", group: "real", format: (r) => (r.realLeads ?? 0) > 0 ? formatCurrency(r.realCpl ?? 0) : "-" },
    { key: "realMqls", label: "MQLs Reais", group: "real", format: (r) => formatNumber(r.realMqls ?? 0) },
    { key: "realCpmql", label: "CPMQL Real", group: "real", format: (r) => (r.realMqls ?? 0) > 0 ? formatCurrency(r.realCpmql ?? 0) : "-" },
  ] : [];

  const cols = [...baseCols, ...realCols];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {hasRealData && (
              <tr className="border-b border-border bg-secondary/10">
                <th colSpan={baseCols.length} className="px-4 py-1.5 text-left text-xs text-muted-foreground/60 font-normal">
                  Dados Meta
                </th>
                <th colSpan={realCols.length} className="px-4 py-1.5 text-left text-xs text-green-400 font-medium">
                  Dados Reais — Planilha
                </th>
              </tr>
            )}
            <tr className="border-b border-border bg-secondary/30">
              {cols.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-medium whitespace-nowrap cursor-pointer hover:text-foreground transition-colors select-none ${
                    col.group === "real" ? "text-green-400/80 hover:text-green-400" : "text-muted-foreground"
                  }`}
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
              >
                {cols.map((col) => (
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                    {col.key === "status" ? (
                      <StatusBadge status={row.status} />
                    ) : col.key === "name" ? (
                      <span className="font-medium max-w-[200px] truncate block" title={row.name}>{row.name}</span>
                    ) : col.group === "real" ? (
                      <span className="text-green-400 font-medium">{col.format(row)}</span>
                    ) : (
                      <span className="text-muted-foreground">{col.format(row)}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={cols.length} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma campanha encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
