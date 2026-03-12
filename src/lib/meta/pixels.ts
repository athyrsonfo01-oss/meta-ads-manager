import { metaFetchAll, metaFetch, META_AD_ACCOUNT_ID } from "./client";

export interface MetaPixel {
  id: string;
  name: string;
  code?: string;
  is_unavailable?: boolean;
  last_fired_time?: string;
  owner_business?: { id: string; name: string };
}

export interface MetaPixelEvent {
  event_name: string;
  count: number;
  creation_time?: string;
}

export interface MetaPixelStats {
  data: Array<{
    timestamp: string;
    count: number;
  }>;
}

export async function fetchPixels(): Promise<MetaPixel[]> {
  return metaFetchAll<MetaPixel>(`/${META_AD_ACCOUNT_ID}/adspixels`, {
    fields: "id,name,code,is_unavailable,last_fired_time,owner_business",
  });
}

export async function fetchPixelEvents(
  pixelId: string,
  since?: string,
  until?: string
): Promise<MetaPixelEvent[]> {
  const now = Math.floor(Date.now() / 1000);
  const defaultSince = now - 28 * 24 * 60 * 60; // 28 dias atrás

  const startTime = since
    ? Math.floor(new Date(since).getTime() / 1000)
    : defaultSince;
  const endTime = until
    ? Math.floor(new Date(until).getTime() / 1000)
    : now;

  const result = await metaFetch<{ data: MetaPixelEvent[] }>(
    `/${pixelId}/stats`,
    {
      aggregation: "event_name",
      start_time: String(startTime),
      end_time: String(endTime),
    }
  );
  return result.data ?? [];
}

export async function fetchPixelEventStats(
  pixelId: string,
  eventName: string,
  since: string,
  until: string
): Promise<MetaPixelStats> {
  return metaFetch<MetaPixelStats>(`/${pixelId}/stats`, {
    fields: "timestamp,count",
    event: eventName,
    start_time: since,
    end_time: until,
    aggregation: "day",
  });
}
