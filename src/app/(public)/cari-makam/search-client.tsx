"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowUpDown, RotateCcw, Search, SearchX, X } from "lucide-react";
import { GraveResultCard } from "@/components/public/grave-result-card";
import type { GraveSummary } from "@/lib/graves/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/feedback";
import { ResultListSkeleton } from "@/components/ui/skeletons";
import { Spinner } from "@/components/ui/spinner";
import { SEARCH } from "@/lib/config";
import { buildSearchQueryString, fetchSearch, type SearchResponse } from "@/lib/search/client";
import { normalizeSearchTerm } from "@/lib/search/normalize";

type Status = "idle" | "loading" | "success" | "error";
type SortKey = "relevance" | "name" | "death-desc";

type Props = {
  blocks: { code: string; name: string }[];
  initialQuery: string;
  initialBlock: string | null;
  initialResult: SearchResponse | null;
  initialError: string | null;
};

export function SearchClient({ blocks, initialQuery, initialBlock, initialResult, initialError }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [block, setBlock] = useState<string | null>(initialBlock);
  const [result, setResult] = useState<SearchResponse | null>(initialResult);
  const [status, setStatus] = useState<Status>(initialError ? "error" : initialResult ? "success" : "idle");
  const [error, setError] = useState<string | null>(initialError);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [searchedTerm, setSearchedTerm] = useState(normalizeSearchTerm(initialQuery));

  const controllerRef = useRef<AbortController | null>(null);
  const lastKeyRef = useRef(initialResult || initialError ? key(normalizeSearchTerm(initialQuery), initialBlock) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (term: string, blockCode: string | null) => {
    lastKeyRef.current = key(term, blockCode);
    controllerRef.current?.abort();
    const qs = buildSearchQueryString(term, blockCode);
    window.history.replaceState(null, "", qs ? `/cari-makam?${qs}` : "/cari-makam");

    if (term.length < SEARCH.minChars) {
      setStatus("idle");
      setResult(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchSearch(term, blockCode, 0, controller.signal);
      setResult(data);
      setSearchedTerm(term);
      setStatus("success");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Data belum dapat dimuat. Coba lagi.");
      setStatus("error");
    }
  }, []);

  // Pencarian saat mengetik (debounce ~300 ms) — hindari request berlebihan.
  useEffect(() => {
    const term = normalizeSearchTerm(query);
    if (key(term, block) === lastKeyRef.current) return;
    const timer = window.setTimeout(() => void run(term, block), SEARCH.debounceMs);
    return () => window.clearTimeout(timer);
  }, [query, block, run]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void run(normalizeSearchTerm(query), block);
  };

  const loadMore = async () => {
    if (!result) return;
    setLoadingMore(true);
    try {
      const controller = new AbortController();
      const next = await fetchSearch(searchedTerm, block, result.items.length, controller.signal);
      setResult({ total: result.total, items: dedupe([...result.items, ...next.items]) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data belum dapat dimuat. Coba lagi.");
    } finally {
      setLoadingMore(false);
    }
  };

  const items = useMemo(() => sortItems(result?.items ?? [], sort), [result, sort]);
  const term = normalizeSearchTerm(query);
  const tooShort = term.length > 0 && term.length < SEARCH.minChars;

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} role="search" className="rounded-2xl border border-line/70 bg-white p-5 shadow-(--shadow-card) sm:p-6">
        <label htmlFor="search-input" className="mb-2 block font-semibold">
          Nama yang dimakamkan atau kode makam
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              id="search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={SEARCH.maxChars}
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Contoh: Rita atau A-032"
              aria-describedby="search-hint"
              className="min-h-13 w-full rounded-xl border border-line bg-surface pl-12 pr-20 text-lg text-ink placeholder:text-muted/80 focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
            />
            {status === "loading" && (
              <Spinner className={cn("pointer-events-none absolute top-1/2 size-5 -translate-y-1/2 text-primary", query ? "right-12" : "right-4")} />
            )}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-1.5 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
              >
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Hapus kata kunci</span>
              </button>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            className="sm:w-44"
            icon={<Search className="size-5" aria-hidden="true" />}
            loading={status === "loading"}
            loadingText="Mencari…"
          >
            Cari Makam
          </Button>
        </div>
        <p id="search-hint" className={cn("mt-2 text-sm", tooShort ? "text-gold" : "text-muted")}>
          {tooShort ? `Ketik minimal ${SEARCH.minChars} huruf.` : "Tidak perlu nama lengkap. Huruf besar/kecil tidak berpengaruh."}
        </p>

        {blocks.length > 0 && (
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium text-muted">Filter berdasarkan blok (opsional)</legend>
            <div className="flex flex-wrap gap-2">
              <BlockChip active={block === null} onClick={() => setBlock(null)} label="Semua Blok" />
              {blocks.map((b) => (
                <BlockChip key={b.code} active={block === b.code} onClick={() => setBlock(b.code)} label={b.name} />
              ))}
            </div>
          </fieldset>
        )}
      </form>

      <section aria-labelledby="hasil-pencarian" aria-busy={status === "loading"}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="hasil-pencarian" className="font-serif text-2xl font-semibold">
              Hasil Pencarian
            </h2>
            <p className="text-muted" role="status" aria-live="polite">
              {status === "success" && result
                ? `Ditemukan ${result.total} hasil untuk kata kunci “${searchedTerm}”`
                : status === "loading"
                  ? "Mencari…"
                  : status === "idle"
                    ? "Masukkan nama untuk mulai mencari."
                    : ""}
            </p>
          </div>
          {status === "success" && items.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-muted">
              <ArrowUpDown className="size-4" aria-hidden="true" />
              Urutkan
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-[0.95rem] text-ink"
              >
                <option value="relevance">Paling relevan</option>
                <option value="name">Nama (A–Z)</option>
                <option value="death-desc">Wafat terbaru</option>
              </select>
            </label>
          )}
        </div>

        {status === "loading" && <ResultListSkeleton />}

        {status === "error" && (
          <EmptyState
            icon={<RotateCcw className="size-6" />}
            title="Data belum dapat dimuat"
            action={
              <Button variant="secondary" onClick={() => void run(normalizeSearchTerm(query), block)}>
                Coba lagi
              </Button>
            }
          >
            {error ?? "Periksa koneksi internet Anda, lalu coba lagi."}
          </EmptyState>
        )}

        {status === "success" && items.length === 0 && (
          <EmptyState icon={<SearchX className="size-6" />} title="Makam tidak ditemukan.">
            <ul className="space-y-1 text-left text-[0.95rem]">
              <li>• Coba ketik sebagian nama saja, misalnya nama depan.</li>
              <li>• Periksa ejaan, atau coba ejaan lain (mis. &quot;Sopandi&quot; / &quot;Supandi&quot;).</li>
              <li>• Pilih &quot;Semua Blok&quot; bila filter blok sedang aktif.</li>
            </ul>
          </EmptyState>
        )}

        {status === "success" && items.length > 0 && (
          <>
            <ul className="animate-fade-in space-y-3">
              {items.map((grave) => (
                <li key={grave.id}>
                  <GraveResultCard grave={grave} />
                </li>
              ))}
            </ul>
            {result && result.items.length < result.total && (
              <div className="mt-6 flex justify-center">
                <Button variant="secondary" size="lg" onClick={loadMore} loading={loadingMore} loadingText="Memuat…">
                  Muat lebih banyak ({result.total - result.items.length} lagi)
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function BlockChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-5 text-[0.95rem] font-medium transition-colors",
        active ? "border-primary bg-primary text-white" : "border-line bg-white text-ink hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}

function key(term: string, block: string | null) {
  return `${term.toLowerCase()}|${block ?? ""}`;
}

function dedupe(items: GraveSummary[]) {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

function sortItems(items: GraveSummary[], sort: SortKey) {
  if (sort === "relevance") return items;
  const copy = [...items];
  if (sort === "name") copy.sort((a, b) => a.deceased_name.localeCompare(b.deceased_name, "id"));
  if (sort === "death-desc") copy.sort((a, b) => (b.death_date ?? "").localeCompare(a.death_date ?? ""));
  return copy;
}
