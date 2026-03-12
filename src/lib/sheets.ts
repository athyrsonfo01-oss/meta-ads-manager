const SHEETS_ID = "1kR38UBZKoiqlU8LllFemTOjgFnC7tGu1IFhohhq8NwE";

// + → espaço, remove espaços extras, lowercase para matching
export function normalizeSheetName(name: string): string {
  return name.replace(/\+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) {
        row.push(current); current = "";
      } else {
        current += c;
      }
    }
    row.push(current);
    result.push(row);
  }
  return result;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  // DD/MM/YYYY ou DD/MM/YY → normaliza para YYYY-MM-DD e cria como UTC
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return new Date(`${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T00:00:00Z`);
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str.split("T")[0] + "T00:00:00Z");
  return null;
}

export function periodToDateRange(period: string): { since: string; until: string } {
  // Trabalhar com datas em UTC para evitar problemas de fuso
  const nowUtc = new Date();
  const todayStr = nowUtc.toISOString().split("T")[0];
  const today = new Date(todayStr + "T00:00:00Z");
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const ago = (n: number) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() - n); return d; };

  switch (period) {
    case "today":      return { since: fmt(today), until: fmt(today) };
    case "yesterday":  return { since: fmt(ago(1)), until: fmt(ago(1)) };
    case "last_7d":    return { since: fmt(ago(7)), until: fmt(today) };
    case "last_14d":   return { since: fmt(ago(14)), until: fmt(today) };
    case "last_30d":   return { since: fmt(ago(30)), until: fmt(today) };
    case "this_month": {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { since: fmt(s), until: fmt(today) };
    }
    case "last_month": {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { since: fmt(s), until: fmt(e) };
    }
    default: return { since: fmt(ago(7)), until: fmt(today) };
  }
}

export interface CampaignSheetStats {
  campaignName: string;
  totalLeads: number;
  totalMqls: number;
}

export async function fetchSheetLeads(since?: string, until?: string): Promise<Map<string, { leads: number; mqls: number }>> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=2026`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return new Map();

    const rows = parseCSV(await res.text());
    if (rows.length < 2) return new Map();

    const norm = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const header = rows[0].map(norm);
    const dataIdx         = header.findIndex(h => h === "data");
    const campanhaIdx     = header.findIndex(h => h === "campanha");
    const faturamentoIdx  = header.findIndex(h => h.includes("faturamento") || h.includes("faturmanto"));

    if (campanhaIdx === -1) return new Map();

    // Comparar datas como strings YYYY-MM-DD para evitar problemas de timezone
    const map = new Map<string, { leads: number; mqls: number }>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Filtro de data — compara string YYYY-MM-DD diretamente
      if ((since || until) && dataIdx >= 0) {
        const rawDate = (row[dataIdx] || "").trim();
        const parsedDate = parseDate(rawDate);
        if (parsedDate) {
          const dateStr = parsedDate.toISOString().split("T")[0];
          if (since && dateStr < since) continue;
          if (until && dateStr > until) continue;
        }
      }

      const faturamento = (row[faturamentoIdx] || "").trim();
      const isMql = faturamento !== "" && faturamento !== "Menos de R$10 mil";

      // Linhas sem campanha contam no total sob chave especial
      const rawCampanha = row[campanhaIdx] || "";
      const key = rawCampanha ? normalizeSheetName(rawCampanha) : "__sem_campanha__";

      const prev = map.get(key) ?? { leads: 0, mqls: 0 };
      map.set(key, { leads: prev.leads + 1, mqls: prev.mqls + (isMql ? 1 : 0) });
    }

    return map;
  } catch {
    return new Map();
  }
}
