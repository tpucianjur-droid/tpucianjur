import Form from "next/form";
import { Search, User } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";

/** Form GET ke /cari-makam — bekerja tanpa JavaScript, dengan navigasi klien bila JS aktif. */
export function QuickSearchForm({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <Form action="/cari-makam" role="search" className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="quick-search" className="sr-only">
        Nama yang dimakamkan
      </label>
      <div className="relative flex-1">
        <User className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id="quick-search"
          name="q"
          type="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          minLength={2}
          maxLength={100}
          required
          autoComplete="off"
          placeholder="Masukkan nama yang dimakamkan…"
          className="min-h-13 w-full rounded-xl border border-line bg-surface pl-12 pr-4 text-base text-ink placeholder:text-muted/80 focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/15"
        />
      </div>
      <SubmitButton size="lg" className="sm:w-44" icon={<Search className="size-5" aria-hidden="true" />} loadingText="Mencari…">
        Cari Makam
      </SubmitButton>
    </Form>
  );
}
