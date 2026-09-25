import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, ImageIcon, Map as MapIcon, Pencil, SearchX, ShieldCheck, User, Users } from "lucide-react";
import { DeleteGraveButton } from "@/components/admin/delete-grave-button";
import { GravePhotoPreview } from "@/components/admin/grave-photo-preview";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { resolveBackHref } from "@/lib/admin/save-flow";
import { APP } from "@/lib/config";
import { getAdminSettings, getGraveForEdit } from "@/lib/data/admin";
import { photoPublicUrl } from "@/lib/env";
import { formatDate, formatDateTime, padGraveNumber } from "@/lib/format";
import { flaggedFields, pickFlags, STATUS_LABEL } from "@/lib/graves/verification";

export const metadata = { title: "Detail Data Makam" };

const EMPTY = "Belum diisi";

/**
 * Detail Makam versi Admin: berbeda dari detail publik, telepon & alamat ahli waris serta status verifikasi per field ditampilkan.
 * Desktop: Foto di kolom kiri, card informasi bertumpuk di kanan. HP: satu tumpukan (Foto → Almarhum → Ahli Waris → Lokasi → Status).
 * Hanya membaca data; Edit & Hapus memakai alur yang sama dengan daftar (kembali ke Data Makam setelah berhasil).
 */
export default async function AdminGraveDetailPage({ params, searchParams }: PageProps<"/admin/makam/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const backHref = resolveBackHref(query.back);
  const [grave, settings] = await Promise.all([getGraveForEdit(id), getAdminSettings().catch(() => null)]);
  const location = settings?.name ?? `${APP.shortName} ${APP.subtitle}`;

  const header = <DetailHeader backHref={backHref} description={`Informasi lengkap data makam di ${location}.`} />;

  // Bukan 404 global: halaman ini juga dimuat ulang tepat setelah data dihapus (sebelum kembali ke daftar).
  if (!grave) {
    return (
      <div className="w-full">
        {header}
        <EmptyState
          icon={<SearchX className="size-6" />}
          title="Data makam tidak ditemukan"
          action={
            <LinkButton href={backHref} variant="secondary" icon={<ArrowLeft className="size-5" aria-hidden="true" />}>
              Kembali ke Daftar
            </LinkButton>
          }
        >
          Data mungkin sudah dihapus atau tautan tidak valid.
        </EmptyState>
      </div>
    );
  }

  const needs = grave.verification_status === "NEEDS_VERIFICATION";
  const flagged = flaggedFields(pickFlags(grave));
  const number = padGraveNumber(grave.grave_number);
  const photoUrl = photoPublicUrl(grave.photo_path);
  // Baris / Posisi hanya bila tercatat di denah (tidak dikarang).
  const position = grave.visual_row !== null && grave.visual_column !== null ? `Baris ${grave.visual_row}, Kolom ${grave.visual_column}` : null;
  const back = `back=${encodeURIComponent(backHref)}`;

  return (
    <div className="w-full">
      {header}

      {grave.archived_at && (
        <Alert tone="warning" title="Data ini ada di arsip" className="mb-4">
          Tidak tampil di halaman publik dan daftar data aktif.
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-5 xl:gap-6">
        {/* Foto makam (opsional). Card ikut setinggi kolom kanan; foto tetap menempel di atas saat digulir. */}
        <Section icon={<ImageIcon className="size-5" />} title="Foto Makam">
          <div className="md:sticky md:top-5">
            <GravePhotoPreview photoUrl={photoUrl} name={grave.deceased_name} />
          </div>
        </Section>

        <div className="flex min-w-0 flex-col gap-4">
          <Section icon={<User className="size-5" />} title="Data Almarhum">
            <InfoList>
              <InfoRow label="Nama" flagged={grave.verify_deceased_name}>
                {grave.deceased_name}
              </InfoRow>
              <InfoRow label="Tanggal Wafat" flagged={grave.verify_death_date}>
                {formatDate(grave.death_date, "Belum tercatat")}
                {grave.date_semantics === "BELUM_DIPASTIKAN" && <span className="mt-0.5 block text-sm text-muted">Arti tanggal belum dipastikan</span>}
              </InfoRow>
            </InfoList>
          </Section>

          {/* Data ahli waris lengkap — hanya di Admin. */}
          <Section icon={<Users className="size-5" />} title="Data Ahli Waris">
            <InfoList>
              <InfoRow label="Nama Ahli Waris" flagged={grave.verify_heir_name}>
                {orEmpty(grave.heir_name)}
              </InfoRow>
              <InfoRow label="Nomor Telepon" flagged={grave.verify_heir_phone}>
                {grave.heir_phone?.trim() ? (
                  <a href={`tel:${grave.heir_phone.replace(/[^\d+]/g, "")}`} className="text-primary underline-offset-2 hover:underline">
                    {grave.heir_phone}
                  </a>
                ) : (
                  orEmpty(null)
                )}
              </InfoRow>
              <InfoRow label="Alamat" flagged={grave.verify_heir_address}>
                <span className="whitespace-pre-line">{orEmpty(grave.heir_address)}</span>
              </InfoRow>
            </InfoList>
          </Section>

          <Section icon={<MapIcon className="size-5" />} title="Lokasi Makam">
            <InfoList>
              <InfoRow label="Blok" flagged={grave.verify_location}>
                {grave.blocks ? grave.blocks.code : orEmpty(null)}
              </InfoRow>
              <InfoRow label="Nomor" flagged={grave.verify_location}>
                {number}
              </InfoRow>
              <InfoRow label="Kode Makam">{grave.grave_code}</InfoRow>
              <InfoRow label="Lokasi TPU">{location}</InfoRow>
              {position && <InfoRow label="Baris / Posisi">{position}</InfoRow>}
            </InfoList>
          </Section>

          <Section icon={<ShieldCheck className="size-5" />} title="Status / Verifikasi">
            <InfoList>
              <InfoRow label="Status">
                <DetailStatusPill needs={needs} />
              </InfoRow>
              {grave.updated_at && <InfoRow label="Terakhir diperbarui">{formatDateTime(grave.updated_at)}</InfoRow>}
              <InfoRow label="Tampil di publik">
                {grave.is_public && !grave.archived_at ? "Ya" : <span className="text-gold">Tidak</span>}
              </InfoRow>
              {grave.transcription_notes?.trim() && (
                <InfoRow label="Catatan">
                  <span className="whitespace-pre-line">{grave.transcription_notes}</span>
                </InfoRow>
              )}
            </InfoList>

            {needs && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
                <p className="flex items-start gap-2 text-[0.95rem] font-semibold">
                  <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-amber-600" aria-hidden="true" />
                  Data makam ini belum sepenuhnya diverifikasi.
                </p>
                {flagged.length > 0 ? (
                  <div className="mt-1.5 pl-6.5">
                    <p className="text-sm">Field yang perlu dicek:</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {flagged.map((field) => (
                        <li key={field.key} className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-sm font-medium text-amber-900">
                          {field.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-1 pl-6.5 text-sm">Mohon lakukan pengecekan data dan dokumen ahli waris.</p>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Aksi. HP: Edit & Hapus berdampingan, Kembali full width di bawahnya. Desktop: rata kanan (Kembali · Edit · Hapus). */}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <LinkButton href={backHref} variant="outline" size="lg" className="w-full px-5 sm:w-auto" icon={<ArrowLeft className="size-5" aria-hidden="true" />}>
          Kembali ke Daftar
        </LinkButton>
        <div className="grid gap-3 min-[360px]:grid-cols-2 sm:flex">
          <LinkButton href={`/admin/makam/${grave.id}/edit?${back}`} size="lg" className="whitespace-nowrap px-4 sm:px-6" icon={<Pencil className="size-5" aria-hidden="true" />}>
            Edit Data
          </LinkButton>
          <DeleteGraveButton
            graveId={grave.id}
            code={grave.grave_code}
            name={grave.deceased_name}
            size="lg"
            variant="dangerSolid"
            label="Hapus Data"
            redirectTo={backHref}
            className="whitespace-nowrap px-4 sm:px-6"
          />
        </div>
      </div>
    </div>
  );
}

/** Judul halaman + "Kembali ke Daftar". HP: tombol di atas judul. Desktop: tombol di kanan judul. */
function DetailHeader({ backHref, description }: { backHref: string; description: string }) {
  return (
    <div className="mb-5 flex flex-col items-start gap-3 sm:mb-6 sm:flex-row-reverse sm:justify-between sm:gap-6">
      <LinkButton
        href={backHref}
        variant="outline"
        size="sm"
        className="min-h-10 shrink-0 sm:min-h-11 sm:px-4 sm:text-[0.95rem]"
        icon={<ArrowLeft className="size-4" aria-hidden="true" />}
      >
        Kembali ke Daftar
      </LinkButton>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Detail Data Makam</h1>
        <p className="mt-1 text-[0.95rem] text-muted sm:text-[1.0625rem]">{description}</p>
      </div>
    </div>
  );
}

function orEmpty(value: string | null | undefined): ReactNode {
  return value?.trim() ? value : <span className="text-muted">{EMPTY}</span>;
}

function Section({ icon, title, className, children }: { icon: ReactNode; title: string; className?: string; children: ReactNode }) {
  return (
    <Card className={cn("min-w-0 p-4 sm:p-5 lg:p-6", className)}>
      <h2 className="mb-3 flex items-center gap-3 text-[1.0625rem] font-bold text-ink sm:text-lg">
        <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-primary sm:size-10">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

/** Label : nilai dengan garis tipis antar baris (semua card, mengikuti referensi). */
function InfoList({ children }: { children: ReactNode }) {
  return <dl className="min-w-0 divide-y divide-line/70">{children}</dl>;
}

/** Baris label : nilai. `flagged` = field ini masih perlu dicek (ditandai amber + teks, tidak hanya warna). */
function InfoRow({ label, flagged = false, children }: { label: string; flagged?: boolean; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-2.5 text-[0.95rem] min-[380px]:grid-cols-[8.25rem_minmax(0,1fr)] sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-4 xl:grid-cols-[12rem_minmax(0,1fr)]">
      <dt className="text-sm text-muted sm:text-[0.95rem]">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-ink [overflow-wrap:anywhere]">
        {children}
        {flagged && (
          <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
            <AlertTriangle className="size-3" aria-hidden="true" />
            Perlu dicek
          </span>
        )}
      </dd>
    </div>
  );
}

function DetailStatusPill({ needs }: { needs: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-semibold",
        needs ? "border-amber-200 bg-amber-50 text-amber-800" : "border-primary/20 bg-primary-soft text-primary",
      )}
    >
      {needs ? <AlertTriangle className="size-4" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
      {needs ? STATUS_LABEL.NEEDS_VERIFICATION : STATUS_LABEL.VERIFIED}
    </span>
  );
}
