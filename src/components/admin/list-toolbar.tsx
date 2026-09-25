"use client";

import Form from "next/form";
import Link, { useLinkStatus } from "next/link";
import type { ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import { RotateCcw, Search } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { inputClass } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { StatusTab } from "@/lib/admin/list-filters";
import { formatNumber } from "@/lib/format";

type Option = { value: string; label: string };

type Props = {
  q: string;
  block: string | null;
  status: string;
  field: string | null;
  blocks: Option[];
  /** Filter status berupa tombol yang langsung terlihat (bukan dropdown). */
  statusTabs: StatusTab[];
  needsCount: number;
  /** Pilihan "field yang perlu dicek" (hanya saat status Perlu Verifikasi). */
  fields: Option[] | null;
  filtered: boolean;
};

/**
 * Toolbar Data Makam: tombol status (tautan, langsung diterapkan), cari (Enter), filter blok (langsung diterapkan), reset.
 * Tetap berupa tautan & form GET biasa (next/form) sehingga URL = filter dan tetap jalan tanpa JavaScript.
 */
export function ListToolbar({ q, block, status, field, blocks, statusTabs, needsCount, fields, filtered }: Props) {
  const submitOnChange = (event: ChangeEvent<HTMLSelectElement>) => event.currentTarget.form?.requestSubmit();
  const select = cn(inputClass(), "min-h-12 pr-9");
  return (
    <>
      <nav aria-label="Filter status" className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-3 text-center text-[0.95rem] font-semibold leading-tight transition-colors sm:px-5",
              tab.active
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-line bg-white text-ink hover:border-primary/40 hover:bg-primary-soft",
            )}
          >
            {tab.label}
            {tab.value === "needs_verification" && needsCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                  tab.active ? "bg-white text-danger" : "bg-danger text-white",
                )}
              >
                {formatNumber(needsCount)}
                <span className="sr-only"> data</span>
              </span>
            )}
            <TabPending />
          </Link>
        ))}
      </nav>
      <Form
        action="/admin/makam"
        role="search"
        className={cn(
          "mb-4 grid grid-cols-2 gap-2.5 sm:gap-3",
          fields ? "xl:grid-cols-[minmax(16rem,1fr)_12rem_13rem_auto]" : "xl:grid-cols-[minmax(16rem,1fr)_12rem_auto]",
        )}
      >
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <div className="relative col-span-2 xl:col-span-1">
          <label htmlFor="q" className="sr-only">
            Cari kode, nama, atau ahli waris
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="q"
            name="q"
            type="search"
            enterKeyHint="search"
            defaultValue={q}
            placeholder="Cari kode, nama, ahli waris..."
            className={cn(inputClass(), "min-h-12 pl-11 pr-11")}
          />
          <PendingIndicator />
        </div>
        <div className={cn(!fields && "col-span-2 xl:col-span-1")}>
          <label htmlFor="blok" className="sr-only">
            Blok
          </label>
          <select id="blok" name="blok" defaultValue={block ?? ""} onChange={submitOnChange} className={select}>
            <option value="">Semua Blok</option>
            {blocks.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        {fields && (
          <div>
            <label htmlFor="field" className="sr-only">
              Field yang perlu dicek
            </label>
            <select id="field" name="field" defaultValue={field ?? ""} onChange={submitOnChange} className={select}>
              <option value="">Semua field perlu dicek</option>
              {fields.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="col-span-2 flex gap-2 xl:col-span-1">
          <button type="submit" className={buttonClass("primary", "md", "min-h-12 flex-1 xl:hidden")}>
            <Search className="size-4" aria-hidden="true" />
            Cari
          </button>
          <button type="submit" className="sr-only max-xl:hidden">
            Terapkan filter
          </button>
          {filtered ? (
            <Link href="/admin/makam" className={buttonClass("secondary", "md", "min-h-12 flex-1 xl:flex-none")}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </Link>
          ) : (
            <span className={buttonClass("secondary", "md", "pointer-events-none min-h-12 flex-1 opacity-50 xl:flex-none")} aria-hidden="true">
              <RotateCcw className="size-4" />
              Reset
            </span>
          )}
        </div>
      </Form>
    </>
  );
}

function TabPending() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className="size-4" label="Memuat data…" /> : null;
}

function PendingIndicator() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary">
      <Spinner className="size-5" label="Memuat data…" />
    </span>
  );
}
