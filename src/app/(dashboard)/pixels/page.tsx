"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Loader2, Zap, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

interface Pixel {
  id: string;
  name: string;
  last_fired_time?: string;
  is_unavailable?: boolean;
}

interface PixelEvent {
  event_name: string;
  count: number;
}

const EVENT_LABELS: Record<string, string> = {
  PageView: "Pageview",
  ViewContent: "Ver Conteúdo",
  Lead: "Lead",
  CompleteRegistration: "Registro Completo",
  InitiateCheckout: "Iniciar Checkout",
  Purchase: "Compra",
  AddToCart: "Adicionar ao Carrinho",
  Search: "Busca",
  Contact: "Contato",
  Schedule: "Agendamento",
  SubmitApplication: "Envio de Formulário",
  AddPaymentInfo: "Info de Pagamento",
  AddToWishlist: "Lista de Desejos",
  FindLocation: "Localização",
  StartTrial: "Início de Trial",
  Subscribe: "Assinatura",
  CustomizeProduct: "Personalizar Produto",
};

const PERIODS = [
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 14 dias", days: 14 },
  { label: "Últimos 28 dias", days: 28 },
  { label: "Últimos 90 dias", days: 90 },
  { label: "Últimos 180 dias", days: 180 },
];

function getDateRange(days: number) {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return {
    since: since.toISOString().split("T")[0],
    until: until.toISOString().split("T")[0],
  };
}

export default function PixelsPage() {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [events, setEvents] = useState<Record<string, PixelEvent[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingPixels, setLoadingPixels] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState<Record<string, boolean>>({});
  const [periodDays, setPeriodDays] = useState(28);

  async function loadPixels() {
    setLoadingPixels(true);
    try {
      const res = await fetch("/api/meta/pixels");
      const data = await res.json();
      setPixels(Array.isArray(data) ? data : []);
    } finally {
      setLoadingPixels(false);
    }
  }

  async function loadEvents(pixelId: string, days: number) {
    setLoadingEvents((prev) => ({ ...prev, [pixelId]: true }));
    try {
      const { since, until } = getDateRange(days);
      const res = await fetch(`/api/meta/pixels?pixelId=${pixelId}&since=${since}&until=${until}`);
      const data = await res.json();
      setEvents((prev) => ({ ...prev, [pixelId]: Array.isArray(data) ? data : [] }));
    } finally {
      setLoadingEvents((prev) => ({ ...prev, [pixelId]: false }));
    }
  }

  function toggleExpand(pixelId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pixelId)) {
        next.delete(pixelId);
      } else {
        next.add(pixelId);
        loadEvents(pixelId, periodDays);
      }
      return next;
    });
  }

  // Recarrega eventos de todos os pixels expandidos ao mudar o período
  useEffect(() => {
    expanded.forEach((pixelId) => loadEvents(pixelId, periodDays));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays]);

  useEffect(() => { loadPixels(); }, []);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pixels & Eventos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe todos os eventos disparados pelo seu pixel Meta
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {PERIODS.map((p) => (
              <option key={p.days} value={p.days}>{p.label}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={loadPixels} disabled={loadingPixels}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingPixels ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {loadingPixels ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : pixels.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Zap className="w-10 h-10 mb-3 opacity-30" />
          <p>Nenhum pixel encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pixels.map((pixel) => (
            <div key={pixel.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Header do Pixel */}
              <button
                onClick={() => toggleExpand(pixel.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/20 transition-colors"
              >
                {expanded.has(pixel.id) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{pixel.name}</p>
                  <p className="text-xs text-muted-foreground">ID: {pixel.id}</p>
                </div>
                {pixel.last_fired_time && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    Último disparo: {new Date(pixel.last_fired_time).toLocaleDateString("pt-BR")}
                  </span>
                )}
                <Badge variant={pixel.is_unavailable ? "error" : "success"} className="text-xs ml-2">
                  {pixel.is_unavailable ? "Inativo" : "Ativo"}
                </Badge>
              </button>

              {/* Eventos */}
              {expanded.has(pixel.id) && (
                <div className="border-t border-border">
                  {loadingEvents[pixel.id] ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="p-5">
                      <p className="text-sm font-medium mb-3">
                        Eventos registrados ({events[pixel.id]?.length ?? 0}) —{" "}
                        <span className="text-muted-foreground font-normal">
                          {PERIODS.find((p) => p.days === periodDays)?.label}
                        </span>
                      </p>
                      {(events[pixel.id] ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhum evento encontrado neste período para este pixel
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {[...(events[pixel.id] ?? [])]
                            .sort((a, b) => b.count - a.count)
                            .map((ev) => (
                              <div
                                key={ev.event_name}
                                className="rounded-lg border border-border bg-secondary/30 p-3"
                              >
                                <p className="text-xs text-muted-foreground font-medium truncate" title={ev.event_name}>
                                  {EVENT_LABELS[ev.event_name] ?? ev.event_name}
                                </p>
                                <p className="text-xl font-bold mt-1">
                                  {formatNumber(ev.count)}
                                </p>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
