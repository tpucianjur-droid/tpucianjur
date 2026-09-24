import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { BlockForm } from "@/components/admin/block-form";
import { DenahEditor } from "@/components/admin/denah-editor";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { cn } from "@/components/ui/cn";
import { MESSAGES } from "@/lib/config";
import { getAdminBlocks, getBlockGravesForEditor } from "@/lib/data/admin";

export const metadata = { title: "Denah Blok" };

export default async function AdminDenahPage({ searchParams }: PageProps<"/admin/denah">) {
  const params = await searchParams;
  const blocks = await getAdminBlocks();
  const adding = params.tambah === "1";
  const requested = typeof params.blok === "string" ? params.blok.toUpperCase() : null;
  const block = adding ? null : (blocks.find((b) => b.code === requested) ?? blocks[0] ?? null);
  const graves = block ? await getBlockGravesForEditor(block.id) : [];

  return (
    <>
      <AdminPageHeader
        title="Denah Blok"
        description="Atur blok, kapasitas, grid, dan posisi makam pada denah — tanpa mengubah kode program."
      />

      <nav aria-label="Pilih blok" className="mb-6">
        <ul className="flex flex-wrap gap-2">
          {blocks.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/denah?blok=${b.code}`}
                aria-current={b.id === block?.id ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 text-[1.0625rem] font-semibold",
                  b.id === block?.id ? "border-primary bg-primary text-white" : "border-line bg-white text-ink hover:border-primary/40",
                )}
              >
                {b.name}
                {!b.is_active && <span className="text-xs font-medium opacity-80">(nonaktif)</span>}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/admin/denah?tambah=1"
              aria-current={adding ? "page" : undefined}
              className={cn(
                "inline-flex min-h-12 items-center gap-2 rounded-xl border border-dashed px-5 font-semibold",
                adding ? "border-primary bg-sage text-primary" : "border-line bg-white text-primary",
              )}
            >
              <Plus className="size-5" aria-hidden="true" />
              Tambah blok
            </Link>
          </li>
        </ul>
      </nav>

      {adding ? (
        <Card className="max-w-2xl p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-bold">Tambah Blok Baru</h2>
          <BlockForm block={null} />
        </Card>
      ) : block ? (
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-1 text-xl font-bold">Pengaturan {block.name}</h2>
            <p className="mb-4 text-muted">
              {graves.length} makam terdaftar · kapasitas {block.capacity ?? "belum ditetapkan"}.
            </p>
            <BlockForm key={block.id} block={block} />
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-1 text-xl font-bold">Posisi Makam — {block.name}</h2>
            <Alert tone="info" className="mb-4">
              {MESSAGES.denahDisclaimer}
            </Alert>
            {graves.length === 0 ? (
              <EmptyState icon={<Plus className="size-6" />} title={`Belum ada makam di ${block.name}`}>
                Tambahkan data makam dengan memilih {block.name} pada formulir Tambah Data Makam.
              </EmptyState>
            ) : (
              <DenahEditor key={block.id} block={block} graves={graves} />
            )}
          </Card>
        </div>
      ) : (
        <EmptyState icon={<Plus className="size-6" />} title="Belum ada blok">
          Tambahkan blok pertama melalui tombol &quot;Tambah blok&quot;.
        </EmptyState>
      )}
    </>
  );
}
