"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { CreateCampaignModal } from "./CreateCampaignModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface AdSet {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  effective_status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  optimization_goal: string;
  billing_event: string;
}

interface Ad {
  id: string;
  adset_id: string;
  campaign_id: string;
  name: string;
  status: string;
  effective_status: string;
}

interface Insight {
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  actions?: Array<{ action_type: string; value: string }>;
}

type Tab = "campaigns" | "adsets" | "ads";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function aggregateInsights(
  data: Insight[],
  key: "campaign_id" | "adset_id" | "ad_id"
): Record<string, Insight> {
  const map: Record<string, Insight> = {};
  for (const ins of data) {
    const id = ins[key];
    if (!id) continue;
    const prev = map[id];
    if (prev) {
      map[id] = {
        ...ins,
        spend: String(parseFloat(prev.spend || "0") + parseFloat(ins.spend || "0")),
        impressions: String(
          parseInt(prev.impressions || "0") + parseInt(ins.impressions || "0")
        ),
        clicks: String(parseInt(prev.clicks || "0") + parseInt(ins.clicks || "0")),
      };
    } else {
      map[id] = ins;
    }
  }
  return map;
}

function getLeads(actions?: Insight["actions"]) {
  return parseInt(actions?.find((a) => a.action_type === "lead")?.value ?? "0", 10);
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 ${
        checked ? "bg-emerald-500" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function Tabs({
  active,
  onChange,
  selectedCampaigns,
  selectedAdsets,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  selectedCampaigns: number;
  selectedAdsets: number;
}) {
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "campaigns", label: "Campanhas" },
    { id: "adsets", label: "Conjuntos de Anúncios", count: selectedCampaigns },
    { id: "ads", label: "Anúncios", count: selectedAdsets || selectedCampaigns },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border mb-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === t.id
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
          {(t.count ?? 0) > 0 && (
            <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Table headers ────────────────────────────────────────────────────────────

// ─── Edit Budget Modal ────────────────────────────────────────────────────────

interface EditBudgetState {
  id: string;
  name: string;
  current: number | null;
  type: "daily" | "lifetime";
}

function EditBudgetModal({
  state,
  onClose,
  onSave,
}: {
  state: EditBudgetState;
  onClose: () => void;
  onSave: (id: string, budget: number, type: "daily" | "lifetime") => Promise<void>;
}) {
  const [value, setValue] = useState(state.current?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(value);
    if (!num || num <= 0) { setError("Informe um valor válido"); return; }
    setLoading(true);
    setError("");
    try {
      await onSave(state.id, num, state.type);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Editar Orçamento</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4 truncate" title={state.name}>{state.name}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {state.type === "daily" ? "Budget Diário (R$)" : "Budget Total (R$)"}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              min="1"
              step="0.01"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: 100.00"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MetricHeaders() {
  return (
    <>
      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Investido</th>
      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Impressões</th>
      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Cliques</th>
      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">CTR</th>
      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">CPC</th>
      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Leads</th>
      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">CPL</th>
    </>
  );
}

function MetricCells({ ins }: { ins?: Insight }) {
  const spend = parseFloat(ins?.spend ?? "0");
  const impressions = parseInt(ins?.impressions ?? "0", 10);
  const clicks = parseInt(ins?.clicks ?? "0", 10);
  const ctr = parseFloat(ins?.ctr ?? "0");
  const cpc = parseFloat(ins?.cpc ?? "0");
  const leads = getLeads(ins?.actions);
  const cpl = leads > 0 ? spend / leads : 0;

  return (
    <>
      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(spend)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground">{formatNumber(impressions)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground">{formatNumber(clicks)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground">{formatPercent(ctr)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(cpc)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground">{formatNumber(leads)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground">
        {leads > 0 ? formatCurrency(cpl) : "-"}
      </td>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [tab, setTab] = useState<Tab>("campaigns");
  const [period, setPeriod] = useState("last_7d");
  const [showModal, setShowModal] = useState(false);

  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignInsights, setCampaignInsights] = useState<Record<string, Insight>>({});
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [editingBudget, setEditingBudget] = useState<EditBudgetState | null>(null);

  // Ad Sets
  const [adsets, setAdsets] = useState<AdSet[] | null>(null);
  const [adsetInsights, setAdsetInsights] = useState<Record<string, Insight>>({});
  const [loadingAdsets, setLoadingAdsets] = useState(false);
  const [selectedAdsets, setSelectedAdsets] = useState<Set<string>>(new Set());

  // Ads
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [adInsights, setAdInsights] = useState<Record<string, Insight>>({});
  const [loadingAds, setLoadingAds] = useState(false);

  // ─── Load campaigns ─────────────────────────────────────────────────────────

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const [campRes, insightRes] = await Promise.all([
        fetch("/api/meta/campaigns?level=campaign"),
        fetch(`/api/meta/insights?level=campaign&datePreset=${period}`),
      ]);
      const campData: Campaign[] = await campRes.json();
      const insightData: Insight[] = await insightRes.json();
      setCampaigns(campData);
      setCampaignInsights(aggregateInsights(insightData, "campaign_id"));
    } finally {
      setLoadingCampaigns(false);
    }
  }, [period]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  // ─── Load ad sets ────────────────────────────────────────────────────────────

  const loadAdsets = useCallback(async () => {
    setLoadingAdsets(true);
    try {
      const [adsetRes, insightRes] = await Promise.all([
        fetch("/api/meta/campaigns?level=adset"),
        fetch(`/api/meta/insights?level=adset&datePreset=${period}`),
      ]);
      const adsetData: AdSet[] = await adsetRes.json();
      const insightData: Insight[] = await insightRes.json();
      setAdsets(adsetData);
      setAdsetInsights(aggregateInsights(insightData, "adset_id"));
    } finally {
      setLoadingAdsets(false);
    }
  }, [period]);

  // ─── Load ads ────────────────────────────────────────────────────────────────

  const loadAds = useCallback(async () => {
    setLoadingAds(true);
    try {
      const [adRes, insightRes] = await Promise.all([
        fetch("/api/meta/campaigns?level=ad"),
        fetch(`/api/meta/insights?level=ad&datePreset=${period}`),
      ]);
      const adData: Ad[] = await adRes.json();
      const insightData: Insight[] = await insightRes.json();
      setAds(adData);
      setAdInsights(aggregateInsights(insightData, "ad_id"));
    } finally {
      setLoadingAds(false);
    }
  }, [period]);

  // ─── Tab switch ──────────────────────────────────────────────────────────────

  function handleTabChange(t: Tab) {
    setTab(t);
    if (t === "adsets" && adsets === null) loadAdsets();
    if (t === "ads" && ads === null) loadAds();
  }

  // Reset lazy data when period changes
  useEffect(() => {
    setAdsets(null);
    setAds(null);
  }, [period]);

  // ─── Toggle campaign status ──────────────────────────────────────────────────

  async function toggleCampaign(id: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setTogglingIds((prev) => new Set(prev).add(id));
    // Optimistic update
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: newStatus, effective_status: newStatus } : c
      )
    );
    try {
      await fetch(`/api/meta/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // ─── Update budget ────────────────────────────────────────────────────────────

  async function updateBudget(id: string, budget: number, type: "daily" | "lifetime") {
    const budgetCents = String(Math.round(budget * 100));
    await fetch(`/api/meta/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget, budgetType: type }),
    });
    // Optimistic update nos dois arrays (campaign e adset)
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, daily_budget: type === "daily" ? budgetCents : c.daily_budget, lifetime_budget: type === "lifetime" ? budgetCents : c.lifetime_budget }
          : c
      )
    );
    setAdsets((prev) =>
      prev
        ? prev.map((a) =>
            a.id === id
              ? { ...a, daily_budget: type === "daily" ? budgetCents : a.daily_budget, lifetime_budget: type === "lifetime" ? budgetCents : a.lifetime_budget }
              : a
          )
        : prev
    );
  }

  // ─── Toggle adset/ad status ──────────────────────────────────────────────────

  async function toggleAdset(id: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setAdsets((prev) =>
      prev
        ? prev.map((a) =>
            a.id === id ? { ...a, status: newStatus, effective_status: newStatus } : a
          )
        : prev
    );
    await fetch(`/api/meta/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function toggleAd(id: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setAds((prev) =>
      prev
        ? prev.map((a) =>
            a.id === id ? { ...a, status: newStatus, effective_status: newStatus } : a
          )
        : prev
    );
    await fetch(`/api/meta/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  // ─── Selection helpers ────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedCampaigns.size === campaigns.length) {
      setSelectedCampaigns(new Set());
    } else {
      setSelectedCampaigns(new Set(sortedCampaigns.map((c) => c.id)));
    }
  }

  // ─── Adset selection helpers ──────────────────────────────────────────────────

  function toggleSelectAdset(id: string) {
    setSelectedAdsets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllAdsets() {
    if (selectedAdsets.size === filteredAdsets.length && filteredAdsets.length > 0) {
      setSelectedAdsets(new Set());
    } else {
      setSelectedAdsets(new Set(filteredAdsets.map((a) => a.id)));
    }
  }

  // ─── Filtered + sorted data (ativos primeiro) ────────────────────────────────

  function sortActive<T extends { status: string; effective_status?: string }>(list: T[]): T[] {
    return [...list].sort((a, b) => {
      const aActive = (a.effective_status ?? a.status) === "ACTIVE" ? 0 : 1;
      const bActive = (b.effective_status ?? b.status) === "ACTIVE" ? 0 : 1;
      return aActive - bActive;
    });
  }

  const sortedCampaigns = sortActive(campaigns);

  const filteredAdsets = sortActive(
    adsets === null
      ? []
      : selectedCampaigns.size > 0
      ? adsets.filter((a) => selectedCampaigns.has(a.campaign_id))
      : adsets
  );

  const filteredAds = sortActive(
    ads === null
      ? []
      : selectedAdsets.size > 0
      ? ads.filter((a) => selectedAdsets.has(a.adset_id))
      : selectedCampaigns.size > 0
      ? ads.filter((a) => selectedCampaigns.has(a.campaign_id))
      : ads
  );

  const periods = [
    { value: "today", label: "Hoje" },
    { value: "yesterday", label: "Ontem" },
    { value: "last_7d", label: "7 dias" },
    { value: "last_14d", label: "14 dias" },
    { value: "last_30d", label: "30 dias" },
    { value: "this_month", label: "Este mês" },
  ];

  const isLoading =
    (tab === "campaigns" && loadingCampaigns) ||
    (tab === "adsets" && loadingAdsets) ||
    (tab === "ads" && loadingAds);

  function handleRefresh() {
    if (tab === "campaigns") loadCampaigns();
    if (tab === "adsets") loadAdsets();
    if (tab === "ads") loadAds();
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tab === "campaigns" && `${campaigns.length} campanhas`}
            {tab === "adsets" && adsets !== null && `${filteredAdsets.length} conjuntos`}
            {tab === "ads" && ads !== null && `${filteredAds.length} anúncios`}
            {selectedCampaigns.size > 0 && (
              <span className="ml-2 text-xs text-primary">
                ({selectedCampaigns.size} campanha{selectedCampaigns.size > 1 ? "s" : ""} selecionada{selectedCampaigns.size > 1 ? "s" : ""})
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {periods.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        active={tab}
        onChange={handleTabChange}
        selectedCampaigns={selectedCampaigns.size}
        selectedAdsets={selectedAdsets.size}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">

            {/* ── Campanhas ── */}
            {tab === "campaigns" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="w-8 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedCampaigns.size === campaigns.length && campaigns.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-input accent-primary cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Campanha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Objetivo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Budget/dia</th>
                    <MetricHeaders />
                  </tr>
                </thead>
                <tbody>
                  {sortedCampaigns.map((c) => {
                    const status = c.effective_status ?? c.status;
                    const isActive = status === "ACTIVE";
                    const budget = c.daily_budget ? parseFloat(c.daily_budget) / 100 : null;
                    const isSelected = selectedCampaigns.has(c.id);

                    return (
                      <tr
                        key={c.id}
                        onClick={() => toggleSelect(c.id)}
                        className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors cursor-pointer ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(c.id)}
                            className="rounded border-input accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium max-w-[220px] truncate block" title={c.name}>{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.id}</span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Toggle
                              checked={isActive}
                              onChange={() => toggleCampaign(c.id, status)}
                              disabled={togglingIds.has(c.id)}
                            />
                            <span className={`text-xs ${isActive ? "text-emerald-500" : "text-muted-foreground"}`}>
                              {isActive ? "Ativo" : "Pausado"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{c.objective}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setEditingBudget({ id: c.id, name: c.name, current: budget, type: "daily" })}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground group transition-colors"
                          >
                            <span>{budget ? formatCurrency(budget) : "—"}</span>
                            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </button>
                        </td>
                        <MetricCells ins={campaignInsights[c.id]} />
                      </tr>
                    );
                  })}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        Nenhuma campanha encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* ── Conjuntos de Anúncios ── */}
            {tab === "adsets" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="w-8 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedAdsets.size === filteredAdsets.length && filteredAdsets.length > 0}
                        onChange={toggleSelectAllAdsets}
                        className="rounded border-input accent-primary cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Conjunto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Objetivo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Budget/dia</th>
                    <MetricHeaders />
                  </tr>
                </thead>
                <tbody>
                  {filteredAdsets.map((a) => {
                    const status = a.effective_status ?? a.status;
                    const isActive = status === "ACTIVE";
                    const budget = a.daily_budget ? parseFloat(a.daily_budget) / 100 : null;
                    const isSelected = selectedAdsets.has(a.id);

                    return (
                      <tr
                        key={a.id}
                        onClick={() => toggleSelectAdset(a.id)}
                        className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors cursor-pointer ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectAdset(a.id)}
                            className="rounded border-input accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium max-w-[220px] truncate block" title={a.name}>{a.name}</span>
                          <span className="text-xs text-muted-foreground">{a.id}</span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Toggle
                              checked={isActive}
                              onChange={() => toggleAdset(a.id, status)}
                            />
                            <span className={`text-xs ${isActive ? "text-emerald-500" : "text-muted-foreground"}`}>
                              {isActive ? "Ativo" : "Pausado"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{a.optimization_goal}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setEditingBudget({ id: a.id, name: a.name, current: budget, type: "daily" })}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground group transition-colors"
                          >
                            <span>{budget ? formatCurrency(budget) : "—"}</span>
                            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </button>
                        </td>
                        <MetricCells ins={adsetInsights[a.id]} />
                      </tr>
                    );
                  })}
                  {filteredAdsets.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        {selectedCampaigns.size > 0
                          ? "Nenhum conjunto encontrado para as campanhas selecionadas"
                          : "Nenhum conjunto de anúncios encontrado"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* ── Anúncios ── */}
            {tab === "ads" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Anúncio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <MetricHeaders />
                  </tr>
                </thead>
                <tbody>
                  {filteredAds.map((a) => {
                    const status = a.effective_status ?? a.status;
                    const isActive = status === "ACTIVE";

                    return (
                      <tr
                        key={a.id}
                        className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium max-w-[220px] truncate block" title={a.name}>{a.name}</span>
                          <span className="text-xs text-muted-foreground">{a.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Toggle
                              checked={isActive}
                              onChange={() => toggleAd(a.id, status)}
                            />
                            <span className={`text-xs ${isActive ? "text-emerald-500" : "text-muted-foreground"}`}>
                              {isActive ? "Ativo" : "Pausado"}
                            </span>
                          </div>
                        </td>
                        <MetricCells ins={adInsights[a.id]} />
                      </tr>
                    );
                  })}
                  {filteredAds.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        {selectedAdsets.size > 0
                          ? "Nenhum anúncio encontrado para os conjuntos selecionados"
                          : selectedCampaigns.size > 0
                          ? "Nenhum anúncio encontrado para as campanhas selecionadas"
                          : "Nenhum anúncio encontrado"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

          </div>
        </div>
      )}

      {editingBudget && (
        <EditBudgetModal
          state={editingBudget}
          onClose={() => setEditingBudget(null)}
          onSave={updateBudget}
        />
      )}

      {showModal && (
        <CreateCampaignModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadCampaigns(); }}
        />
      )}
    </div>
  );
}
