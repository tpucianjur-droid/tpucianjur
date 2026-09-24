import { cn } from "./cn";
import { Skeleton } from "./feedback";
import { Spinner } from "./spinner";

/**
 * Skeleton UI yang menyerupai konten sebenarnya (dipakai oleh loading.tsx & state pemuatan klien),
 * agar tidak pernah muncul layar putih kosong saat data diambil.
 */

/** Overlay halus di atas area yang sedang dimuat, mis. "Memuat denah…". */
export function LoadingOverlay({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="status"
      className={cn("absolute inset-0 z-20 flex items-center justify-center bg-white/55 backdrop-blur-[1px] animate-fade-in", className)}
    >
      <span className="inline-flex items-center gap-2.5 rounded-full border border-line/80 bg-white px-4 py-2 text-sm font-medium text-ink shadow-(--shadow-card)">
        <Spinner className="size-4 text-primary" />
        {label}
      </span>
    </div>
  );
}

/** Kerangka hero halaman publik (judul + deskripsi). */
export function PageHeroSkeleton() {
  return (
    <div className="border-b border-line/60 bg-white">
      <div className="mx-auto max-w-6xl space-y-4 px-4 pb-16 pt-8 sm:px-6 md:pb-20 md:pt-12">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
    </div>
  );
}

/** Daftar kartu hasil pencarian. */
export function ResultListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-4 rounded-2xl border border-line/70 bg-white p-5">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Area denah: kerangka + overlay "Memuat denah…". */
export function DenahSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-line bg-[#f1f6f3]", className ?? "h-[62vh] min-h-80 md:h-[560px]")}>
      <div className="absolute inset-6 grid grid-cols-8 gap-3 opacity-60" aria-hidden="true">
        {Array.from({ length: 32 }, (_, i) => (
          <Skeleton key={i} className="rounded-t-full rounded-b-md" />
        ))}
      </div>
      <LoadingOverlay label="Memuat denah…" />
    </div>
  );
}

/** Judul halaman Admin. */
export function AdminHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {withAction && <Skeleton className="h-12 w-48 rounded-xl" />}
    </div>
  );
}

/** Tabel data (desktop) / kartu (HP). */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white" aria-hidden="true">
      <div className="flex gap-4 bg-surface px-4 py-3.5">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3.5 w-24 max-md:hidden" />
        <Skeleton className="h-3.5 w-32 max-md:hidden" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="h-4 w-14" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-7 w-28 rounded-full max-md:hidden" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Formulir: beberapa section kartu berisi field. */
export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="space-y-6" aria-hidden="true">
      {Array.from({ length: sections }, (_, i) => (
        <div key={i} className="rounded-2xl border border-line/70 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <Skeleton className="size-11 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dashboard: KPI + chart + tabel. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="space-y-2.5 border-l-[3px] border-line pl-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 rounded-2xl border border-line/70 bg-white p-5">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3.5 w-36" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("rounded-2xl border border-line/70 bg-white p-5", i === 2 && "lg:col-span-2 xl:col-span-1")}>
            <Skeleton className="mb-5 h-5 w-48" />
            <div className="flex h-52 items-end gap-3">
              {i === 0 ? (
                <Skeleton className="mx-auto size-44 rounded-full" />
              ) : (
                [40, 75, 55, 90, 30, 65].map((h, j) => <Skeleton key={j} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />)
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("space-y-3 rounded-2xl border border-line/70 bg-white p-5", i === 2 && "lg:col-span-2 xl:col-span-1")}>
            <Skeleton className="mb-2 h-5 w-44" />
            <Skeleton className="h-9 w-full" />
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-6 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Label aksesibel untuk halaman yang sedang dimuat. */
export function LoadingRegion({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}
