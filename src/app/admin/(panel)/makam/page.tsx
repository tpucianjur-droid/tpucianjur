import { redirect } from "next/navigation";
import { CheckCircle2, Plus, SearchX } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ExportMenu } from "@/components/admin/export-button";
import { GraveList, Pagination } from "@/components/admin/grave-list";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { LinkButton } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { ADMIN } from "@/lib/config";
import { buildListHref, buildStatusTabs } from "@/lib/admin/list-filters";
import { countNeedsVerification, getAdminBlocks, listGraves, parseListFilters, type GraveListFilters } from "@/lib/data/admin";
import { formatNumber } from "@/lib/format";
import { VERIFY_FIELDS } from "@/lib/graves/verification";

export const metadata = { title: "Data Makam" };

export default async function GraveListPage({ searchParams }: PageProps<"/admin/makam">) {
  const filters = parseListFilters(await searchParams);
  const needsMode = filters.status === "needs_verification";
  const [{ items, total }, blocks, needsCount] = await Promise.all([
    listGraves(filters),
    getAdminBlocks(),
    countNeedsVerification().catch(() => 0),
  ]);
  const statusParam = (status: GraveListFilters["status"]) => (status === "all" ? null : status);
  const hrefFor = (page: number) =>
    buildListHref("/admin/makam", {
      q: filters.q,
      blok: filters.block,
      status: statusParam(filters.status),
      field: filters.field,
      page,
    });

  // Halaman terakhir kosong (mis. setelah data terakhirnya dihapus): pindah ke halaman terakhir yang masih berisi.
  const lastPage = Math.max(1, Math.ceil(total / ADMIN.pageSize));
  if (items.length === 0 && filters.page > lastPage) redirect(hrefFor(lastPage));

  const filtered = Boolean(filters.q || filters.block || filters.status !== "all" || filters.field);
  const pdfQuery = hrefFor(1).replace("/admin/makam", "");

  return (
    <>
      <AdminPageHeader
        title="Data Makam"
        description="Kelola data makam TPU Astana Pratiksha Cianjur."
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <LinkButton href="/admin/makam/tambah" size="lg" className="max-sm:px-3" icon={<Plus className="size-5" aria-hidden="true" />}>
              Tambah Data
            </LinkButton>
            <ExportMenu pdfHref={`/admin/makam/export/pdf${pdfQuery}`} className="max-sm:[&>button]:w-full max-sm:[&>button]:px-3" />
          </div>
        }
      />

      <ListToolbar
        q={filters.q}
        block={filters.block}
        status={filters.status}
        field={filters.field}
        blocks={blocks.map((b) => ({ value: b.id, label: b.name }))}
        statusTabs={buildStatusTabs("/admin/makam", filters)}
        needsCount={needsCount}
        fields={needsMode ? VERIFY_FIELDS.map((f) => ({ value: f.key, label: f.label })) : null}
        filtered={filtered}
      />

      {needsMode && (
        <Alert tone="info" className="mb-4">
          Cara kerja: tekan <strong>Edit</strong> → cocokkan dengan catatan asli → perbaiki bila perlu → tekan{" "}
          <strong>Tandai sudah benar</strong> pada field merah → <strong>Simpan</strong>. Setelah tersimpan Anda kembali ke daftar
          ini untuk lanjut ke data berikutnya.
        </Alert>
      )}

      <p className="mb-3 text-sm text-muted" role="status">
        {needsMode ? `${formatNumber(total)} data masih perlu verifikasi` : `${formatNumber(total)} data ditemukan`}
      </p>

      {items.length === 0 ? (
        needsMode && !filters.q && !filters.block && !filters.field ? (
          <EmptyState icon={<CheckCircle2 className="size-6" />} title="Tidak ada data yang perlu diverifikasi">
            Semua data aktif sudah terverifikasi.
          </EmptyState>
        ) : (
          <EmptyState icon={<SearchX className="size-6" />} title="Data tidak ditemukan">
            Ubah kata kunci atau filter, atau tekan Reset.
          </EmptyState>
        )
      ) : (
        <GraveList
          items={items}
          blockCodes={Object.fromEntries(blocks.map((b) => [b.id, b.code]))}
          listHref={hrefFor(filters.page)}
        />
      )}
      <Pagination page={filters.page} total={total} pageSize={ADMIN.pageSize} buildHref={hrefFor} />
    </>
  );
}
