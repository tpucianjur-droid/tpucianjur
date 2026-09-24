import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { LinkPendingIcon } from "@/components/ui/link-status";
import { cn } from "@/components/ui/cn";
import type { GraveListItem } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";
import { FlaggedChips, StatusBadge } from "./admin-ui";

/** Tabel di desktop, kartu di HP. Nama berwarna merah bila field nama perlu dicek. */
export function GraveList({ items, from }: { items: GraveListItem[]; from?: "verifikasi" }) {
  const editHref = (id: string) => `/admin/makam/${id}/edit${from ? `?from=${from}` : ""}`;
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-white md:block">
        <table className="w-full text-left">
          <thead className="bg-surface text-sm text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Kode</th>
              <th scope="col" className="px-4 py-3 font-semibold">Nama yang dimakamkan</th>
              <th scope="col" className="px-4 py-3 font-semibold">Tanggal wafat</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status / field perlu dicek</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((grave) => (
              <tr key={grave.id} className="align-top hover:bg-surface/60">
                <td className="whitespace-nowrap px-4 py-4 font-semibold">{grave.grave_code}</td>
                <td className="px-4 py-4">
                  <span className={cn("text-[1.0625rem] font-semibold", grave.verify_deceased_name && "text-danger")}>
                    {grave.deceased_name}
                  </span>
                  {grave.heir_name && <span className="block text-sm text-muted">Ahli waris: {grave.heir_name}</span>}
                  {!grave.is_public && <span className="block text-sm font-medium text-gold">Tidak tampil di publik</span>}
                </td>
                <td className={cn("whitespace-nowrap px-4 py-4", grave.verify_death_date && "font-medium text-danger")}>
                  {formatDate(grave.death_date, "—")}
                </td>
                <td className="space-y-2 px-4 py-4">
                  <StatusBadge status={grave.verification_status} />
                  <FlaggedChips record={grave} />
                </td>
                <td className="px-4 py-4 text-right">
                  <Link href={editHref(grave.id)} className={buttonClass("secondary", "md", "whitespace-nowrap")}>
                    <LinkPendingIcon className="size-4" icon={<Pencil className="size-4" aria-hidden="true" />} />
                    {grave.verification_status === "NEEDS_VERIFICATION" ? "Edit & Verifikasi" : "Edit"}
                    <span className="sr-only"> {grave.deceased_name}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((grave) => (
          <li key={grave.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-muted">{grave.grave_code}</p>
                <p className={cn("text-lg font-semibold", grave.verify_deceased_name && "text-danger")}>{grave.deceased_name}</p>
                <p className={cn("text-[0.95rem] text-muted", grave.verify_death_date && "font-medium text-danger")}>
                  Wafat: {formatDate(grave.death_date, "—")}
                </p>
              </div>
              <StatusBadge status={grave.verification_status} />
            </div>
            <div className="mt-3">
              <FlaggedChips record={grave} />
            </div>
            <Link href={editHref(grave.id)} className={buttonClass("secondary", "lg", "mt-3 w-full")}>
              <LinkPendingIcon className="size-4" icon={<Pencil className="size-4" aria-hidden="true" />} />
              {grave.verification_status === "NEEDS_VERIFICATION" ? "Edit & Verifikasi" : "Edit"}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  buildHref,
}: {
  page: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav aria-label="Halaman" className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-muted">
        Menampilkan {from}–{to} dari {total} data
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className={buttonClass("secondary", "lg", "max-sm:px-4")}>
            <LinkPendingIcon icon={<ChevronLeft className="size-5" aria-hidden="true" />} /> Sebelumnya
          </Link>
        ) : (
          <span className={buttonClass("secondary", "lg", "pointer-events-none opacity-50 max-sm:px-4")} aria-disabled="true">
            <ChevronLeft className="size-5" aria-hidden="true" /> Sebelumnya
          </span>
        )}
        <span className="px-2 font-semibold">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link href={buildHref(page + 1)} className={buttonClass("secondary", "lg", "max-sm:px-4")}>
            Berikutnya <LinkPendingIcon icon={<ChevronRight className="size-5" aria-hidden="true" />} />
          </Link>
        ) : (
          <span className={buttonClass("secondary", "lg", "pointer-events-none opacity-50 max-sm:px-4")} aria-disabled="true">
            Berikutnya <ChevronRight className="size-5" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}

export function buildListHref(base: string, params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "" && !(key === "page" && value === 1)) {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}
