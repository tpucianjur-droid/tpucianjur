"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Grid2X2, Pencil, TableProperties } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { LinkPendingIcon } from "@/components/ui/link-status";
import { cn } from "@/components/ui/cn";
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
const VIEW_STORAGE_KEY = "admin-grave-list-view";
const TABLE_VIEW_QUERY = "(min-width: 1280px), (min-width: 768px) and (orientation: landscape)";

type ViewMode = "table" | "grid";

function storedView(): ViewMode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === "table" || stored === "grid" ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Default tabel di desktop/tablet landscape, kartu ringkas di HP/tablet portrait.
 * Preferensi tampilan hanya disimpan di browser dan tidak memengaruhi query/data.
 * Nama/tanggal/ahli waris berwarna merah bila field tersebut perlu dicek.
 */
export function GraveList({ items, blockCodes, listHref }: Props) {
  const blockOf = (grave: GraveListItem) => (grave.block_id ? (blockCodes[grave.block_id] ?? "—") : "—");
  const [preferredView, setPreferredView] = useState<ViewMode | null>(storedView);
  const [tableAvailable, setTableAvailable] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(TABLE_VIEW_QUERY);
    const updateAvailability = () => setTableAvailable(media.matches);

    updateAvailability();
    media.addEventListener("change", updateAvailability);
    return () => media.removeEventListener("change", updateAvailability);
  }, []);

  const view: ViewMode = tableAvailable ? (preferredView ?? "table") : "grid";

  const chooseView = (nextView: ViewMode) => {
    setPreferredView(nextView);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, nextView);
    } catch {
      // Pilihan tetap berlaku selama halaman aktif meski storage diblokir.
    }
  };

  return (
    <>
      {tableAvailable && (
        <div className="mb-3 flex justify-end" role="group" aria-label="Tampilan daftar">
          <button
            type="button"
            aria-pressed={view === "table"}
            onClick={() => chooseView("table")}
            className={buttonClass(view === "table" ? "primary" : "secondary", "xs")}
          >
            <TableProperties className="size-4" aria-hidden="true" />
            Tabel
          </button>
          <button
            type="button"
            aria-pressed={view === "grid"}
            onClick={() => chooseView("grid")}
            className={buttonClass(view === "grid" ? "primary" : "secondary", "xs", "ml-2")}
          >
            <Grid2X2 className="size-4" aria-hidden="true" />
            Grid
          </button>
        </div>
      )}

      {view === "table" && (
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-line bg-white [contain:paint]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] table-fixed text-left text-[0.925rem]">
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
        </div>
      )}

      {view === "grid" && (
        <ul className="grid gap-3 sm:grid-cols-2">
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
      )}
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
