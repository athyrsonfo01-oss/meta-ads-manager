"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, X, Check } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  effective_status: string;
}

export function CampaignFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedIds = (searchParams.get("campaigns") ?? "")
    .split(",")
    .filter(Boolean);

  useEffect(() => {
    fetch("/api/meta/campaigns")
      .then((r) => r.json())
      .then((data) => setCampaigns(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id];

    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) {
      params.set("campaigns", next.join(","));
    } else {
      params.delete("campaigns");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("campaigns");
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectedNames = campaigns
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => c.name);

  return (
    <div ref={ref} className="relative w-full md:w-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 w-full md:w-auto px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
          selectedIds.length > 0
            ? "border-primary bg-primary/10 text-primary"
            : "border-input bg-background text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="truncate max-w-[200px]">
          {selectedIds.length === 0
            ? "Filtrar campanhas"
            : selectedIds.length === 1
            ? selectedNames[0]
            : `${selectedIds.length} campanhas selecionadas`}
        </span>
        {selectedIds.length > 0 ? (
          <X
            className="w-3.5 h-3.5 flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); clearAll(); }}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 z-50 w-72 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {campaigns.length} campanhas
            </p>
            {selectedIds.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-primary hover:underline"
              >
                Limpar filtro
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
            ) : (
              campaigns.map((c) => {
                const isSelected = selectedIds.includes(c.id);
                const isActive = c.effective_status === "ACTIVE";
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? "bg-primary border-primary" : "border-border"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" title={c.name}>{c.name}</p>
                    </div>
                    <span className={`text-xs flex-shrink-0 ${isActive ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {isActive ? "Ativa" : "Pausada"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
