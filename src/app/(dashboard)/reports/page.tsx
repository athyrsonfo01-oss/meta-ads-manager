"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, ChevronDown, ChevronRight, TrendingUp, AlertTriangle } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface Report {
  id: string;
  date: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  fullAnalysis: string;
  totalSpend: number;
  totalLeads: number;
  totalMqls: number;
  avgCpl: number;
  avgCpmql: number;
  createdAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/ai/reports")
      .then((r) => r.json())
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Renderiza markdown simples
  function renderMarkdown(text: string) {
    return text
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="text-base font-semibold mt-4 mb-2">{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} className="text-lg font-bold mt-5 mb-2">{line.slice(2)}</h2>;
        if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm text-muted-foreground list-disc">{line.slice(2)}</li>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="text-sm font-semibold">{line.slice(2, -2)}</p>;
        if (line.trim() === "") return <br key={i} />;
        return <p key={i} className="text-sm text-muted-foreground">{line}</p>;
      });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Relatórios de IA</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Análises diárias geradas automaticamente pelo Claude AI
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhum relatório disponível ainda</p>
          <p className="text-xs mt-1">Os relatórios são gerados automaticamente todo dia às 9h</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isExpanded = expanded.has(report.id);
            return (
              <div key={report.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => toggleExpand(report.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-secondary/20 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">
                      Relatório de{" "}
                      {new Date(report.date + "T12:00:00").toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                      {report.summary}
                    </p>
                  </div>
                  {/* KPIs rápidos */}
                  <div className="hidden md:flex items-center gap-6 mr-2 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">Investido</p>
                      <p className="text-sm font-semibold">{formatCurrency(report.totalSpend)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Leads</p>
                      <p className="text-sm font-semibold">{formatNumber(report.totalLeads)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CPL</p>
                      <p className="text-sm font-semibold">
                        {report.totalLeads > 0 ? formatCurrency(report.avgCpl) : "—"}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Conteúdo expandido */}
                {isExpanded && (
                  <div className="border-t border-border p-5 space-y-5">
                    {/* Métricas do dia */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        { label: "Investimento", value: formatCurrency(report.totalSpend) },
                        { label: "Leads", value: formatNumber(report.totalLeads) },
                        { label: "MQLs", value: formatNumber(report.totalMqls) },
                        { label: "CPL Médio", value: report.totalLeads > 0 ? formatCurrency(report.avgCpl) : "—" },
                        { label: "CPMQL Médio", value: report.totalMqls > 0 ? formatCurrency(report.avgCpmql) : "—" },
                      ].map((m) => (
                        <div key={m.label} className="rounded-lg border border-border bg-secondary/30 p-3">
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                          <p className="text-base font-bold mt-1">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Destaques e Atenções */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <p className="text-sm font-semibold text-emerald-400">Destaques Positivos</p>
                        </div>
                        <ul className="space-y-1.5">
                          {report.highlights.map((h, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-emerald-400 mt-0.5">•</span>
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <p className="text-sm font-semibold text-amber-400">Pontos de Atenção</p>
                        </div>
                        <ul className="space-y-1.5">
                          {report.concerns.map((c, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-amber-400 mt-0.5">•</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Análise completa */}
                    <div className="rounded-lg border border-border bg-secondary/20 p-4">
                      <p className="text-sm font-semibold mb-3">Análise Completa</p>
                      <div className="prose-sm max-w-none">
                        {renderMarkdown(report.fullAnalysis)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
