import { Suspense } from "react";
import { DashboardContent } from "./DashboardContent";
import { DateFilter } from "@/components/dashboard/DateFilter";
import { CampaignFilter } from "@/components/dashboard/CampaignFilter";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

const PERIOD_LABELS: Record<string, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last_7d: "Últimos 7 dias",
  last_14d: "Últimos 14 dias",
  last_30d: "Últimos 30 dias",
  this_month: "Este mês",
  last_month: "Mês passado",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; since?: string; until?: string; campaigns?: string }>;
}) {
  const params = await searchParams;
  const since = params.since;
  const until = params.until;
  const period = params.period ?? "last_7d";
  const campaignIds = params.campaigns ? params.campaigns.split(",").filter(Boolean) : undefined;

  const isCustom = !!since && !!until;
  const periodLabel = isCustom
    ? `${since} até ${until}`
    : (PERIOD_LABELS[period] ?? period);

  const suspenseKey = [isCustom ? `${since}-${until}` : period, params.campaigns ?? ""].join("|");

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Performance das campanhas — {periodLabel}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <CampaignFilter />
          <DateFilter current={period} since={since} until={until} />
        </div>
      </div>

      <Suspense
        key={suspenseKey}
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <DashboardContent period={period} since={since} until={until} campaignIds={campaignIds} />
      </Suspense>
    </div>
  );
}
