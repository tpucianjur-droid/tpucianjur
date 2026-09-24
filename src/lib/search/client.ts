import type { GraveSummary } from "@/lib/graves/types";

export type SearchResponse = { items: GraveSummary[]; total: number };

export function buildSearchQueryString(term: string, block: string | null, offset = 0): string {
  const params = new URLSearchParams();
  if (term) params.set("q", term);
  if (block) params.set("blok", block);
  if (offset > 0) params.set("offset", String(offset));
  return params.toString();
}

export class SearchRequestError extends Error {}

export async function fetchSearch(
  term: string,
  block: string | null,
  offset: number,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<SearchResponse> {
  const response = await fetcher(`/api/cari?${buildSearchQueryString(term, block, offset)}`, { signal });
  const body = (await response.json().catch(() => null)) as (SearchResponse & { error?: string }) | null;
  if (!response.ok || !body) {
    throw new SearchRequestError(body?.error ?? "Data belum dapat dimuat. Coba lagi.");
  }
  return { items: body.items, total: body.total };
}
