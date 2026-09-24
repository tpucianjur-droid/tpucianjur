import Form from "next/form";
import Link from "next/link";
import { CheckCircle2, Plus, Search, SearchX } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ExportButton } from "@/components/admin/export-button";
import { buildListHref, GraveList, Pagination } from "@/components/admin/grave-list";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { inputClass } from "@/components/ui/field";
import { ADMIN } from "@/lib/config";
import { countNeedsVerification, getAdminBlocks, listGraves, parseListFilters, type GraveListFilters } from "@/lib/data/admin";
import { VERIFY_FIELDS } from "@/lib/graves/verification";

export const metadata = { title: "Data Makam" };

const STATUS_TABS: { value: GraveListFilters["status"]; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "needs_verification", label: "Perlu Verifikasi" },
  { value: "verified", label: "Terverifikasi" },
  { value: "archived", label: "Arsip" },
];

export default async function GraveListPage({ searchParams }: PageProps<"/admin/makam">) {
  const filters = parseListFilters(await searchParams);
  const needsMode = filters.status === "needs_verification";
  const [{ items, total }, blocks, needsCount] = await Promise.all([
    listGraves(filters),
    getAdminBlocks(),
    countNeedsVerification().catch(() => 0),
  ]);
  const statusParam = (status: GraveListFilters["status"]) => (status === "all" ? null : status);
  // Filter "field yang perlu dicek" hanya berlaku di tab Perlu Verifikasi.
  const hrefFor = (page: number) =>
    buildListHref("/admin/makam", {
      q: filters.q,
      blok: filters.block,
      status: statusParam(filters.status),
      field: needsMode ? filters.field : null,
      page,
    });

  return (
    <>
      <AdminPageHeader
        title="Data Makam"
        description="Cari, tambah, perbarui, dan verifikasi data makam."
        actions={
          <>
            <ExportButton />
            <LinkButton href="/admin/makam/tambah" size="lg" icon={<Plus className="size-5" aria-hidden="true" />}>
              Tambah Data Makam
            </LinkButton>
          </>
        }
      />

      <nav aria-label="Filter status" className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const active = filters.status === tab.value;
          return (
            <Link
              key={tab.value}
              href={buildListHref("/admin/makam", { q: filters.q, blok: filters.block, status: statusParam(tab.value) })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-semibold transition-colors",
                active ? "border-primary bg-primary text-white" : "border-line bg-white text-ink hover:bg-surface",
              )}
            >
              {tab.label}
              {tab.value === "needs_verification" && needsCount > 0 && (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", active ? "bg-white text-danger" : "bg-danger text-white")}>
                  {needsCount}
                  <span className="sr-only"> data</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {needsMode && (
        <Alert tone="info" className="mb-4">
          Cara kerja: tekan <strong>Edit &amp; Verifikasi</strong> → cocokkan dengan catatan asli → perbaiki bila perlu → tekan{" "}
          <strong>Tandai sudah benar</strong> pada field merah → <strong>Simpan</strong>. Setelah disimpan, Anda dapat langsung
          lanjut ke data berikutnya.
        </Alert>
      )}

      <Form
        action="/admin/makam"
        className={cn(
          "mb-6 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2",
          needsMode ? "lg:grid-cols-[1fr_180px_240px_auto]" : "lg:grid-cols-[1fr_220px_auto]",
        )}
        role="search"
      >
        {filters.status !== "all" && <input type="hidden" name="status" value={filters.status} />}
        <div>
          <label htmlFor="q" className="mb-1.5 block font-semibold">
            Cari nama / kode / ahli waris
          </label>
          <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Contoh: Siti atau A-012" className={inputClass()} />
        </div>
        <div>
          <label htmlFor="blok" className="mb-1.5 block font-semibold">
            Blok
          </label>
          <select id="blok" name="blok" defaultValue={filters.block ?? ""} className={inputClass()}>
            <option value="">Semua blok</option>
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>
                {block.name}
              </option>
            ))}
          </select>
        </div>
        {needsMode && (
          <div>
            <label htmlFor="field" className="mb-1.5 block font-semibold">
              Field yang perlu dicek
            </label>
            <select id="field" name="field" defaultValue={filters.field ?? ""} className={inputClass()}>
              <option value="">Semua field</option>
              {VERIFY_FIELDS.map((field) => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-end">
          <SubmitButton size="lg" className="w-full" icon={<Search className="size-5" aria-hidden="true" />} loadingText="Memuat…">
            Tampilkan
          </SubmitButton>
        </div>
      </Form>

      <p className="mb-3 text-muted" role="status">
        {needsMode ? `${total} data masih perlu verifikasi` : `${total} data ditemukan`}
      </p>

      {items.length === 0 ? (
        needsMode && !filters.q && !filters.block && !filters.field ? (
          <EmptyState icon={<CheckCircle2 className="size-6" />} title="Tidak ada data yang perlu diverifikasi">
            Semua data aktif sudah terverifikasi.
          </EmptyState>
        ) : (
          <EmptyState icon={<SearchX className="size-6" />} title="Data tidak ditemukan">
            Ubah kata kunci atau filter, lalu tekan Tampilkan.
          </EmptyState>
        )
      ) : (
        <GraveList items={items} from={needsMode ? "verifikasi" : undefined} />
      )}
      <Pagination page={filters.page} total={total} pageSize={ADMIN.pageSize} buildHref={hrefFor} />
    </>
  );
}
