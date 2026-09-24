import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, History } from "lucide-react";
import { AdminPageHeader, StatusBadge } from "@/components/admin/admin-ui";
import { ArchiveButton } from "@/components/admin/archive-button";
import { GraveForm, type Notice } from "@/components/admin/grave-form";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { MESSAGES } from "@/lib/config";
import { getAdminBlocks, getBlockGravesForEditor, getGraveAudit, getGraveForEdit, getNextNeedsVerification } from "@/lib/data/admin";
import { photoPublicUrl } from "@/lib/env";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Edit Data Makam" };

const FIELD_LABELS: Record<string, string> = {
  deceased_name: "nama",
  death_date: "tanggal wafat",
  date_semantics: "arti tanggal",
  heir_name: "nama ahli waris",
  heir_phone: "telepon",
  heir_address: "alamat",
  block_id: "blok",
  grave_number: "nomor",
  grave_code: "kode",
  visual_row: "baris",
  visual_column: "kolom",
  visual_x: "posisi X",
  visual_y: "posisi Y",
  photo_path: "foto",
  is_public: "tampil publik",
  archived_at: "arsip",
  transcription_notes: "catatan",
};

export default async function EditGravePage({ params, searchParams }: PageProps<"/admin/makam/[id]/edit">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const grave = await getGraveForEdit(id);
  if (!grave) notFound();

  const fromVerification = query.from === "verifikasi";
  const [blocks, blockGraves, audit, next] = await Promise.all([
    getAdminBlocks(),
    grave.block_id ? getBlockGravesForEditor(grave.block_id) : Promise.resolve([]),
    getGraveAudit(grave.id),
    fromVerification ? getNextNeedsVerification(grave.grave_code) : Promise.resolve(null),
  ]);

  // Keberhasilan simpan sudah diumumkan lewat toast; peringatan foto gagal tetap ditampilkan di formulir.
  const initialNotices: Notice[] = [];
  if (query.photo === "failed") initialNotices.push({ tone: "warning", message: MESSAGES.photoUploadFailed });

  const backHref = fromVerification ? "/admin/makam?status=needs_verification" : "/admin/makam";

  return (
    <>
      <AdminPageHeader
        title={`Edit Data Makam ${grave.grave_code}`}
        description={grave.deceased_name}
        back={{ href: backHref, label: "Data Makam" }}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={grave.verification_status} />
            {grave.is_public && !grave.archived_at && (
              <Link
                href={`/makam/${grave.grave_code}`}
                target="_blank"
                className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                Lihat halaman publik <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        }
      />

      {grave.archived_at && (
        <Alert tone="warning" title="Data ini ada di arsip" className="mb-6">
          Tidak tampil di halaman publik dan daftar data aktif. Gunakan tombol di bagian bawah untuk mengembalikan.
        </Alert>
      )}

      <GraveForm
        grave={grave}
        blocks={blocks}
        blockGraves={blockGraves}
        photoUrl={photoPublicUrl(grave.photo_path)}
        backHref={backHref}
        nextHref={next ? `/admin/makam/${next.id}/edit?from=verifikasi` : null}
        initialNotices={initialNotices}
      />

      <div className="mt-6 grid gap-6 pb-28 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <History className="size-5 text-primary" aria-hidden="true" />
            Riwayat Perubahan
          </h2>
          {audit.length === 0 ? (
            <p className="text-muted">Belum ada riwayat.</p>
          ) : (
            <ol className="space-y-3">
              {audit.map((entry) => (
                <li key={entry.id} className="border-l-2 border-sage-strong pl-3">
                  <p className="font-semibold">
                    {entry.action === "INSERT" ? "Data dibuat" : entry.action === "DELETE" ? "Data dihapus" : "Data diubah"} oleh{" "}
                    {entry.actorName}
                  </p>
                  <p className="text-sm text-muted">{formatDateTime(entry.created_at)}</p>
                  {entry.changedFields.length > 0 && (
                    <p className="text-sm text-muted">
                      Diubah: {entry.changedFields.map((f) => FIELD_LABELS[f] ?? (f.startsWith("verify_") ? "status verifikasi" : f)).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="space-y-3 p-5 sm:p-6">
          <h2 className="text-xl font-bold">Arsip</h2>
          <p className="text-muted">
            Gunakan arsip bila data tercatat ganda atau keliru. Data tidak dihapus permanen dan tetap tersimpan di riwayat.
          </p>
          <ArchiveButton graveId={grave.id} archived={Boolean(grave.archived_at)} />
        </Card>
      </div>
    </>
  );
}
