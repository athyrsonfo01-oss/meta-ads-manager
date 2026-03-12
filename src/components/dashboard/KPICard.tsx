import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number; // percentual vs período anterior
  colorClass?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorClass = "text-primary bg-primary/10",
}: KPICardProps) {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;
  const TrendIcon = trendPositive ? TrendingUp : trendNegative ? TrendingDown : Minus;

  return (
    <div className="rounded-xl border border-border bg-card p-3 md:p-5 flex flex-col gap-2 md:gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs md:text-sm text-muted-foreground font-medium leading-tight">{title}</p>
        <div className={cn("w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0", colorClass)}>
          <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </div>
      </div>

      <div>
        <p className="text-lg md:text-2xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      {trend !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trendPositive && "text-emerald-400",
            trendNegative && "text-red-400",
            !trendPositive && !trendNegative && "text-muted-foreground"
          )}
        >
          <TrendIcon className="w-3 h-3" />
          <span>
            {trendPositive ? "+" : ""}
            {trend?.toFixed(1)}% vs ontem
          </span>
        </div>
      )}
    </div>
  );
}
