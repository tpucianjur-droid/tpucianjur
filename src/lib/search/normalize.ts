import { SEARCH } from "@/lib/config";
import { parseGraveCode } from "@/lib/graves/code";

export type SearchInput = {
  term: string;
  code: string | null;
  block: string | null;
};

/** Trim + rapikan spasi ganda + buang karakter kontrol. */
export function normalizeSearchTerm(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH.maxChars);
}

export function normalizeBlockFilter(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toUpperCase();
  return /^[A-Z]{1,3}$/.test(value) ? value : null;
}

export function isSearchable(term: string): boolean {
  return term.length >= SEARCH.minChars;
}

export function buildSearchInput(rawQuery: unknown, rawBlock: unknown): SearchInput {
  const term = normalizeSearchTerm(rawQuery);
  return { term, code: parseGraveCode(term), block: normalizeBlockFilter(rawBlock) };
}

/**
 * Untuk filter PostgREST `or=(...)` di Admin: buang karakter yang punya arti khusus
 * dalam sintaks filter (koma, kurung, wildcard) agar input tidak bisa menyisipkan filter lain.
 */
export function sanitizeForPostgrestFilter(term: string): string {
  return term.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim();
}
