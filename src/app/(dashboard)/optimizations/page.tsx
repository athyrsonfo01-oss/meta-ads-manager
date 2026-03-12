"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Suggestion {
  id: string;
  entityId: string;
  entityType: string;
  entityName: string;
  type: string;
  title: string;
  reasoning: string;
  currentValue?: string;
  suggestedValue?: string;
  impact?: string;
  status: "pending" | "approved" | "rejected" | "executed";
  createdAt: string;
  executedAt?: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pause_campaign: { icon: Pause, color: "text-amber-400", label: "Pausar Campanha" },
  activate_campaign: { icon: Play, color: "text-emerald-400", label: "Ativar Campanha" },
  increase_budget: { icon: TrendingUp, color: "text-blue-400", label: "Aumentar Budget" },
  decrease_budget: { icon: TrendingDown, color: "text-orange-400", label: "Reduzir Budget" },
  pause_adset: { icon: Pause, color: "text-amber-400", label: "Pausar Conjunto" },
  activate_adset: { icon: Play, color: "text-emerald-400", label: "Ativar Conjunto" },
  pause_ad: { icon: Pause, color: "text-amber-400", label: "Pausar Anúncio" },
  activate_ad: { icon: Play, color: "text-emerald-400", label: "Ativar Anúncio" },
  change_bid: { icon: TrendingUp, color: "text-violet-400", label: "Ajustar Lance" },
};

const STATUS_CONFIG = {
  pending: { label: "Aguardando", variant: "warning" as const, icon: Clock },
  approved: { label: "Aprovada", variant: "default" as const, icon: CheckCircle },
  executed: { label: "Executada", variant: "success" as const, icon: CheckCircle },
  rejected: { label: "Rejeitada", variant: "error" as const, icon: XCircle },
};

export default function OptimizationsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "executed" | "rejected">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/suggestions");
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setProcessing((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/ai/suggestions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message ?? "Erro ao processar ação");
      }
      await load();
    } finally {
      setProcessing((prev) => ({ ...prev, [id]: false }));
    }
  }

  const filtered = suggestions.filter((s) => {
    if (filter === "all") return true;
    if (filter === "pending") return s.status === "pending";
    if (filter === "executed") return s.status === "executed";
    if (filter === "rejected") return s.status === "rejected";
    return true;
  });

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Otimizações IA
            {pendingCount > 0 && (
              <span className="text-sm bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-normal">
                {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sugestões geradas pelo Claude AI • Revise e aprove antes de executar
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5">
        {(["pending", "all", "executed", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "pending" ? "Pendentes" : f === "all" ? "Todas" : f === "executed" ? "Executadas" : "Rejeitadas"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <CheckCircle className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhuma sugestão {filter !== "all" ? `com status "${filter}"` : ""}</p>
          <p className="text-xs mt-1">As sugestões são geradas automaticamente todo dia às 9h</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const typeConfig = TYPE_CONFIG[s.type] ?? {
              icon: AlertTriangle,
              color: "text-muted-foreground",
              label: s.type,
            };
            const statusConfig = STATUS_CONFIG[s.status];
            const TypeIcon = typeConfig.icon;
            const isPending = s.status === "pending";
            const isProcessing = processing[s.id];

            return (
              <div key={s.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start gap-4">
                  {/* Ícone do tipo */}
                  <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold">{s.title}</span>
                      <Badge variant={statusConfig.variant} className="text-xs">
                        {statusConfig.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {s.entityType === "campaign" ? "Campanha" : s.entityType === "adset" ? "Conjunto" : "Anúncio"}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-1">{s.entityName}</p>

                    {/* Valores atual → sugerido */}
                    {(s.currentValue || s.suggestedValue) && (
                      <div className="flex items-center gap-2 text-sm my-2">
                        {s.currentValue && (
                          <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                            Atual: {s.currentValue}
                          </span>
                        )}
                        {s.currentValue && s.suggestedValue && (
                          <span className="text-muted-foreground">→</span>
                        )}
                        {s.suggestedValue && (
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">
                            Sugerido: {s.suggestedValue}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Justificativa */}
                    <div className="mt-2 rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Justificativa da IA:</p>
                      <p className="text-sm">{s.reasoning}</p>
                    </div>

                    {/* Impacto esperado */}
                    {s.impact && (
                      <p className="text-xs text-muted-foreground mt-2">
                        <span className="font-medium">Impacto esperado:</span> {s.impact}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mt-3">
                      Gerado em {new Date(s.createdAt).toLocaleString("pt-BR")}
                      {s.executedAt && ` • Executado em ${new Date(s.executedAt).toLocaleString("pt-BR")}`}
                    </p>
                  </div>

                  {/* Botões de ação */}
                  {isPending && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleAction(s.id, "approve")}
                        disabled={isProcessing}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                        )}
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(s.id, "reject")}
                        disabled={isProcessing}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
