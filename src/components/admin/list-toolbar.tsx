"use client";

import Form from "next/form";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import { RotateCcw, Search } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { inputClass } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

type Option = { value: string; label: string };

type Props = {
  q: string;
  block: string | null;
  status: string;
  field: string | null;
  blocks: Option[];
  statuses: Option[];
  /** Pilihan "field yang perlu dicek" (hanya saat status Perlu Verifikasi). */
  fields: Option[] | null;
  filtered: boolean;
};

/**
 * Toolbar Data Makam: cari (Enter), filter blok & status (langsung diterapkan saat dipilih), reset.
 * Tetap berupa form GET biasa (next/form) sehingga URL = filter dan tetap jalan tanpa JavaScript.
 */
export function ListToolbar({ q, block, status, field, blocks, statuses, fields, filtered }: Props) {
  const submitOnChange = (event: ChangeEvent<HTMLSelectElement>) => event.currentTarget.form?.requestSubmit();
  const select = cn(inputClass(), "min-h-12 pr-9");
  return (
    <Form
      action="/admin/makam"
      role="search"
      className={cn(
        "mb-4 grid grid-cols-2 gap-2.5 sm:gap-3",
        fields ? "xl:grid-cols-[minmax(16rem,1fr)_11rem_12rem_13rem_auto]" : "xl:grid-cols-[minmax(16rem,1fr)_11rem_12rem_auto]",
      )}
    >
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
      <div>
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
      <div>
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select id="status" name="status" defaultValue={status} onChange={submitOnChange} className={select}>
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {fields && (
        <div className="col-span-2 xl:col-span-1">
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
  );
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
