"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h3 className="font-semibold text-destructive">Erro ao carregar dados</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        Não foi possível buscar os dados da Meta API. Verifique:
      </p>
      <ul className="text-sm text-muted-foreground list-disc ml-4 space-y-1">
        <li>Se o <strong>META_ACCESS_TOKEN</strong> está correto e não expirou</li>
        <li>Se o <strong>META_AD_ACCOUNT_ID</strong> está no formato <code>act_123456</code></li>
        <li>Se o app tem permissão <strong>ads_read</strong> no Meta for Developers</li>
      </ul>
      <p className="text-xs text-muted-foreground mt-3 font-mono bg-secondary/50 p-2 rounded">
        {error.message}
      </p>
    </div>
  );
}
