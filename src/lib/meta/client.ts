const BASE_URL = "https://graph.facebook.com/v21.0";

export const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID!;
export const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!;

export async function metaFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
  options: RequestInit = {}
): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("access_token", META_ACCESS_TOKEN);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    ...options,
    next: { revalidate: 0 },
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(
      data.error?.message || `Meta API error: ${res.status} ${res.statusText}`
    );
  }

  return data as T;
}

export async function metaPost<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("access_token", META_ACCESS_TOKEN);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Meta API POST error: ${res.status}`);
  }

  return data as T;
}

// Paginação automática
export async function metaFetchAll<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = null;

  const firstPage = await metaFetch<{ data: T[]; paging?: { next?: string } }>(
    endpoint,
    { ...params, limit: "200" }
  );

  results.push(...firstPage.data);
  nextUrl = firstPage.paging?.next ?? null;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    const page = await res.json();
    if (page.data) results.push(...page.data);
    nextUrl = page.paging?.next ?? null;
  }

  return results;
}
