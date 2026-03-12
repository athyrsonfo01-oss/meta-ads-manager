"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Loader2, Users, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

interface Audience {
  id: string;
  name: string;
  subtype: string;
  type: string;
  approximate_count_lower_bound?: number;
  description?: string;
  lookalike_spec?: { country: string; ratio: number };
}

const SUBTYPE_LABELS: Record<string, string> = {
  CUSTOM: "Personalizado",
  WEBSITE: "Website",
  APP: "App",
  OFFLINE_CONVERSION: "Conversão Offline",
  LOOKALIKE: "Lookalike",
  SAVED: "Salvo",
  ENGAGEMENT: "Engajamento",
  VIDEO: "Vídeo",
  LEAD_GENERATION: "Lead Generation",
  DYNAMIC_RULE: "Regra Dinâmica",
  CUSTOMER_FILE: "Lista de Clientes",
};

const SUBTYPE_BADGE: Record<string, "default" | "secondary" | "success" | "warning"> = {
  LOOKALIKE: "success",
  WEBSITE: "default",
  CUSTOMER_FILE: "warning",
  SAVED: "secondary",
};

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/meta/audiences");
      const data = await res.json();
      setAudiences(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = audiences.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const groups = {
    LOOKALIKE: filtered.filter((a) => a.subtype?.includes("LOOKALIKE")),
    WEBSITE: filtered.filter((a) => a.subtype === "WEBSITE"),
    CUSTOMER_FILE: filtered.filter((a) => a.subtype === "CUSTOMER_FILE"),
    SAVED: filtered.filter((a) => a.type === "SAVED"),
    other: filtered.filter(
      (a) =>
        !a.subtype?.includes("LOOKALIKE") &&
        a.subtype !== "WEBSITE" &&
        a.subtype !== "CUSTOMER_FILE" &&
        a.type !== "SAVED"
    ),
  };

  function AudienceGroup({
    title,
    items,
  }: {
    title: string;
    items: Audience[];
  }) {
    if (items.length === 0) return null;
    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{title} ({items.length})</h3>
        <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Tamanho Est.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.name}</p>
                    {a.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                        {a.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={SUBTYPE_BADGE[a.subtype] ?? "secondary"} className="text-xs">
                      {SUBTYPE_LABELS[a.subtype] ?? a.subtype ?? a.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {a.approximate_count_lower_bound
                      ? `~${formatNumber(a.approximate_count_lower_bound)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {a.lookalike_spec
                      ? `${a.lookalike_spec.country} • ${(a.lookalike_spec.ratio * 100).toFixed(0)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Públicos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {audiences.length} públicos encontrados
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar público..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <AudienceGroup title="Lookalike" items={groups.LOOKALIKE} />
          <AudienceGroup title="Website (Pixel)" items={groups.WEBSITE} />
          <AudienceGroup title="Lista de Clientes" items={groups.CUSTOMER_FILE} />
          <AudienceGroup title="Públicos Salvos" items={groups.SAVED} />
          <AudienceGroup title="Outros" items={groups.other} />
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-30" />
              <p>Nenhum público encontrado</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
