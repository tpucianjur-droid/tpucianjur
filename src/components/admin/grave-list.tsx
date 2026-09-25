import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Eye, Pencil } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { LinkPendingIcon } from "@/components/ui/link-status";
import { cn } from "@/components/ui/cn";
import { pageList } from "@/lib/admin/pagination";
import type { GraveListItem } from "@/lib/data/admin";
import { formatDate, formatDateShort, padGraveNumber } from "@/lib/format";
import { FlagSummary, StatusBadge } from "./admin-ui";
import { DeleteGraveButton } from "./delete-grave-button";

type Props = {
  items: GraveListItem[];
  /** block_id => kode blok. */
  blockCodes: Record<string, string>;
  /** URL daftar saat ini (filter & halaman) agar dari Detail/Edit kembali ke konteks yang sama. */
  listHref: string;
};

const HEIR_EMPTY = "Belum diisi";

/**
 * Tabel di desktop lebar (xl), kartu ringkas di HP & tablet — tabel 8 kolom tidak dipaksa mengecil.
 * Nama/tanggal/ahli waris berwarna merah bila field tersebut perlu dicek.
 */
export function GraveList({ items, blockCodes, listHref }: Props) {
  const blockOf = (grave: GraveListItem) => (grave.block_id ? (blockCodes[grave.block_id] ?? "—") : "—");

  return (
    <>
      <div className="hidden overflow-clip rounded-2xl border border-line bg-white xl:block">
        <table className="w-full table-fixed text-left text-[0.925rem]">
          <colgroup>
            <col className="w-[4.75rem]" />
            <col />
            <col />
            <col className="w-[7.25rem]" />
            <col className="w-[3.25rem]" />
            <col className="w-16" />
            <col className="w-[9.5rem]" />
            <col className="w-[16.25rem]" />
          </colgroup>
          <thead className="text-sm text-muted">
            <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:border-b [&>th]:border-line [&>th]:bg-surface [&>th]:whitespace-nowrap [&>th]:px-2.5 [&>th]:py-3 [&>th]:font-semibold">
              <th scope="col">Kode</th>
              <th scope="col">Nama</th>
              <th scope="col">Ahli Waris</th>
              <th scope="col">Tanggal Wafat</th>
              <th scope="col">Blok</th>
              <th scope="col">Nomor</th>
              <th scope="col">Status</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line [&_td]:px-2.5 [&_td]:py-3">
            {items.map((grave) => (
              <tr key={grave.id} className="align-middle hover:bg-surface/60">
                <td className="whitespace-nowrap font-semibold">{grave.grave_code}</td>
                <td>
                  <span className={cn("block break-words font-semibold text-ink", grave.verify_deceased_name && "text-danger")}>
                    {grave.deceased_name}
                  </span>
                  {!grave.is_public && <span className="block text-xs font-medium text-gold">Tidak tampil di publik</span>}
                </td>
                <td className={cn("break-words text-ink", grave.verify_heir_name && "font-medium text-danger")}>
                  {grave.heir_name?.trim() ? grave.heir_name : <span className="text-muted">{HEIR_EMPTY}</span>}
                </td>
                <td className={cn("whitespace-nowrap", grave.verify_death_date && "font-medium text-danger")}>
                  {formatDateShort(grave.death_date)}
                </td>
                <td>{blockOf(grave)}</td>
                <td className="tabular-nums">{padGraveNumber(grave.grave_number)}</td>
                <td>
                  <StatusBadge status={grave.verification_status} compact />
                  <FlagSummary record={grave} className="mt-1" />
                </td>
                <td>
                  <RowActions grave={grave} listHref={listHref} className="flex items-center gap-1" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:hidden">
        {items.map((grave) => (
          <li key={grave.id} className="flex flex-col rounded-2xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="pt-0.5 font-semibold text-muted">{grave.grave_code}</p>
              <StatusBadge status={grave.verification_status} compact />
            </div>
            <p className={cn("mt-0.5 break-words text-lg font-semibold leading-snug", grave.verify_deceased_name && "text-danger")}>
              {grave.deceased_name}
            </p>
            <p className={cn("break-words text-[0.95rem]", grave.verify_heir_name && "font-medium text-danger")}>
              <span className={cn(!grave.verify_heir_name && "text-muted")}>Ahli Waris:</span>{" "}
              {grave.heir_name?.trim() ? grave.heir_name : <span className="text-muted">{HEIR_EMPTY}</span>}
            </p>
            <p className="mt-2 text-sm text-muted">
              <span className={cn(grave.verify_death_date && "font-medium text-danger")}>Wafat: {formatDate(grave.death_date, "—")}</span>
              <br />
              <span className={cn(grave.verify_location && "font-medium text-danger")}>
                Blok {blockOf(grave)} • No. {padGraveNumber(grave.grave_number)}
              </span>
            </p>
            {(!grave.is_public || grave.verification_status === "NEEDS_VERIFICATION") && (
              <div className="mt-1 space-y-0.5">
                <FlagSummary record={grave} />
                {!grave.is_public && <p className="text-xs font-medium text-gold">Tidak tampil di publik</p>}
              </div>
            )}
            <RowActions grave={grave} listHref={listHref} className="mt-auto grid grid-cols-3 gap-2 pt-3" />
          </li>
        ))}
      </ul>
    </>
  );
}

/** Aksi per baris: Detail → Edit → Hapus. Hapus berupa outline agar tidak lebih dominan dari Detail/Edit. */
function RowActions({ grave, listHref, className }: { grave: GraveListItem; listHref: string; className?: string }) {
  const back = `back=${encodeURIComponent(listHref)}`;
  return (
    <div className={className}>
      <Link href={`/admin/makam/${grave.id}?${back}`} className={buttonClass("outline", "xs")}>
        <LinkPendingIcon className="size-4" icon={<Eye className="size-4" aria-hidden="true" />} />
        Detail
        <span className="sr-only"> {grave.deceased_name}</span>
      </Link>
      <Link href={`/admin/makam/${grave.id}/edit?${back}`} className={buttonClass("outlinePrimary", "xs")}>
        <LinkPendingIcon className="size-4" icon={<Pencil className="size-4" aria-hidden="true" />} />
        Edit
        <span className="sr-only"> {grave.deceased_name}</span>
      </Link>
      <DeleteGraveButton graveId={grave.id} code={grave.grave_code} name={grave.deceased_name} size="xs" />
    </div>
  );
}

/** Paginasi bernomor (HP: sebelumnya/berikutnya + "x dari y"). */
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
  const square = "inline-flex size-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors";
  return (
    <nav aria-label="Halaman" className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted">
        Menampilkan {from}–{to} dari {total} data
      </p>
      <div className="flex items-center gap-1.5">
        <PageArrow href={page > 1 ? buildHref(page - 1) : null} label="Halaman sebelumnya">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </PageArrow>
        <span className="px-2 text-sm font-semibold sm:hidden">
          {page} dari {pages}
        </span>
        <ul className="hidden items-center gap-1.5 sm:flex">
          {pageList(page, pages).map((p, i) =>
            p === null ? (
              <li key={`gap${i}`} className="w-6 text-center text-muted" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={p}>
                {p === page ? (
                  <span aria-current="page" className={cn(square, "border-primary bg-primary text-white")}>
                    {p}
                  </span>
                ) : (
                  <Link href={buildHref(p)} className={cn(square, "border-line bg-white text-ink hover:border-primary/40 hover:bg-primary-soft")}>
                    <span className="sr-only">Halaman </span>
                    {p}
                  </Link>
                )}
              </li>
            ),
          )}
        </ul>
        <PageArrow href={page < pages ? buildHref(page + 1) : null} label="Halaman berikutnya">
          <ChevronRight className="size-5" aria-hidden="true" />
        </PageArrow>
      </div>
    </nav>
  );
}

function PageArrow({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  const cls = "inline-flex size-10 items-center justify-center rounded-lg border border-line bg-white text-ink";
  if (!href) {
    return (
      <span className={cn(cls, "opacity-40")} aria-disabled="true">
        {children}
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <Link href={href} className={cn(cls, "hover:border-primary/40 hover:bg-primary-soft")}>
      <LinkPendingIcon icon={children} />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
