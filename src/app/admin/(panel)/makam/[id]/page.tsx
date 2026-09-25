import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Hash, ImageIcon, Map as MapIcon, MapPin, Pencil, SearchX, ShieldCheck, User, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
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
 * Foto punya card sendiri (preview + "Lihat Foto", atau placeholder bila belum ada).
 * Hanya membaca data; Edit & Hapus memakai alur yang sama dengan daftar (kembali ke Data Makam setelah berhasil).
 */
export default async function AdminGraveDetailPage({ params, searchParams }: PageProps<"/admin/makam/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const backHref = resolveBackHref(query.back);
  const [grave, settings] = await Promise.all([getGraveForEdit(id), getAdminSettings().catch(() => null)]);

  const header = (
    <AdminPageHeader
      title="Detail Data Makam"
      description={`Informasi lengkap data makam di ${settings?.name ?? `${APP.shortName} ${APP.subtitle}`}.`}
      back={{ href: backHref, label: "Data Makam" }}
    />
  );

  // Bukan 404 global: halaman ini juga dimuat ulang tepat setelah data dihapus (sebelum kembali ke daftar).
  if (!grave) {
    return (
      <div className="max-w-6xl">
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
  const blockCode = grave.blocks?.code ?? "—";
  const number = padGraveNumber(grave.grave_number);
  const location = settings?.name ?? `${APP.shortName} ${APP.subtitle}`;
  const photoUrl = photoPublicUrl(grave.photo_path);
  // Baris / Posisi hanya bila tercatat di denah (tidak dikarang).
  const position = grave.visual_row !== null && grave.visual_column !== null ? `Baris ${grave.visual_row}, Kolom ${grave.visual_column}` : null;
  const back = `back=${encodeURIComponent(backHref)}`;

  return (
    <div className="max-w-6xl">
      {header}

      {grave.archived_at && (
        <Alert tone="warning" title="Data ini ada di arsip" className="mb-4">
          Tidak tampil di halaman publik dan daftar data aktif.
        </Alert>
      )}

      {/* A. Header makam */}
      <Card className="mb-4 flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-full sm:size-16",
              needs ? "bg-amber-50 text-amber-600" : "bg-sage text-primary",
            )}
            aria-hidden="true"
          >
            <HeadstoneIcon className="size-7 sm:size-8" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div>
                <p className="text-sm text-muted">Kode Makam</p>
                <p className="font-serif text-3xl font-semibold leading-tight text-ink">{grave.grave_code}</p>
              </div>
              <DetailStatusPill needs={needs} />
            </div>
            <p className={cn("mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.95rem]", grave.verify_location ? "text-amber-800" : "text-muted")}>
              <span className="inline-flex items-center gap-1.5">
                <MapIcon className="size-4" aria-hidden="true" />
                Blok {blockCode}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Hash className="size-4" aria-hidden="true" />
                Nomor {number}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-line pt-4 md:w-72 md:shrink-0 md:border-l md:border-t-0 md:py-1 md:pl-6 md:pt-1">
          <SoftIcon className="size-9 md:size-11">
            <MapPin className="size-5" />
          </SoftIcon>
          <div className="min-w-0">
            <p className="text-sm text-muted">Lokasi TPU</p>
            <p className="break-words font-semibold leading-snug text-ink">{location}</p>
          </div>
        </div>
      </Card>

      {/*
        Desktop: kolom kiri Foto + Lokasi, kolom kanan Almarhum + Ahli Waris + Status.
        HP: kolom memakai `contents` sehingga semua card menjadi satu tumpukan yang diurutkan `order`
        (Foto → Almarhum → Ahli Waris → Lokasi → Status).
      */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
          {/* B. Foto makam (opsional) */}
          <Section icon={<ImageIcon className="size-5" />} title="Foto Makam" className="order-1">
            <GravePhotoPreview photoUrl={photoUrl} name={grave.deceased_name} />
          </Section>

          {/* E. Lokasi makam */}
          <Section icon={<MapIcon className="size-5" />} title="Lokasi Makam" className="order-4">
            <InfoList divided>
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
        </div>

        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
          {/* C. Data almarhum */}
          <Section icon={<User className="size-5" />} title="Data Almarhum" className="order-2">
            <InfoList>
              <InfoRow label="Nama" flagged={grave.verify_deceased_name}>
                {grave.deceased_name}
              </InfoRow>
              <InfoRow label="Tanggal Wafat" flagged={grave.verify_death_date}>
                {formatDate(grave.death_date, "Belum tercatat")}
                {grave.date_semantics === "BELUM_DIPASTIKAN" && (
                  <span className="block text-sm font-normal text-muted">Arti tanggal belum dipastikan</span>
                )}
              </InfoRow>
            </InfoList>
          </Section>

          {/* D. Data ahli waris (lengkap — hanya di Admin) */}
          <Section icon={<Users className="size-5" />} title="Data Ahli Waris" className="order-3">
            <InfoList>
              <InfoRow label="Nama Ahli Waris" flagged={grave.verify_heir_name}>
                {orEmpty(grave.heir_name)}
              </InfoRow>
              <InfoRow label="Nomor Telepon" flagged={grave.verify_heir_phone}>
                {grave.heir_phone?.trim() ? (
                  <a href={`tel:${grave.heir_phone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">
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

          {/* F. Status / verifikasi */}
          <Section icon={<ShieldCheck className="size-5" />} title="Status / Verifikasi" className="order-5">
            <InfoList>
              <InfoRow label="Status">
                <DetailStatusPill needs={needs} size="sm" />
              </InfoRow>
              {grave.updated_at && <InfoRow label="Terakhir diperbarui">{formatDateTime(grave.updated_at)}</InfoRow>}
              <InfoRow label="Tampil di publik">
                {grave.is_public && !grave.archived_at ? "Ya" : <span className="text-gold">Tidak</span>}
              </InfoRow>
              {grave.transcription_notes?.trim() && (
                <InfoRow label="Catatan">
                  <span className="whitespace-pre-line font-normal">{grave.transcription_notes}</span>
                </InfoRow>
              )}
            </InfoList>

            {needs && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
                <p className="flex items-start gap-2 font-semibold">
                  <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-amber-600" aria-hidden="true" />
                  Data makam ini belum sepenuhnya diverifikasi.
                </p>
                {flagged.length > 0 ? (
                  <>
                    <p className="mt-1 text-[0.95rem]">Field yang perlu dicek:</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {flagged.map((field) => (
                        <li key={field.key} className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-sm font-medium text-amber-900">
                          {field.label}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-1 text-[0.95rem]">Mohon lakukan pengecekan data dan dokumen ahli waris.</p>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Aksi: HP = Edit/Hapus berdampingan, Kembali full width di bawah. Desktop = bar card, Kembali kiri, Edit/Hapus kanan. */}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:border-line/70 sm:bg-white sm:p-4 sm:shadow-(--shadow-card)">
        <LinkButton href={backHref} variant="secondary" size="lg" className="w-full px-5 sm:w-auto" icon={<ArrowLeft className="size-5" aria-hidden="true" />}>
          Kembali ke Daftar
        </LinkButton>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <LinkButton
            href={`/admin/makam/${grave.id}/edit?${back}`}
            size="lg"
            className="px-4 sm:px-6"
            icon={<Pencil className="size-5" aria-hidden="true" />}
          >
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
            className="px-4 sm:px-6"
          />
        </div>
      </div>
    </div>
  );
}

function orEmpty(value: string | null | undefined): ReactNode {
  return value?.trim() ? value : <span className="font-normal text-muted">{EMPTY}</span>;
}

function Section({ icon, title, className, children }: { icon: ReactNode; title: string; className?: string; children: ReactNode }) {
  return (
    <Card className={cn("min-w-0 p-4 sm:p-6", className)}>
      <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-ink">
        <SoftIcon className="size-9">{icon}</SoftIcon>
        {title}
      </h2>
      {children}
    </Card>
  );
}

/** `divided` = garis tipis antar baris (card Lokasi Makam, mengikuti referensi). */
function InfoList({ children, className, divided = false }: { children: ReactNode; className?: string; divided?: boolean }) {
  return (
    <dl
      className={cn(
        "grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[9.5rem_minmax(0,1fr)]",
        divided
          ? "[&>dd]:border-b [&>dd]:border-line/70 [&>dd]:py-2 [&>dd:last-of-type]:border-b-0 [&>dt]:border-b [&>dt]:border-line/70 [&>dt]:py-2 [&>dt:last-of-type]:border-b-0"
          : "gap-y-2.5",
        className,
      )}
    >
      {children}
    </dl>
  );
}

/** Baris label : nilai. `flagged` = field ini masih perlu dicek (ditandai amber + teks, tidak hanya warna). */
function InfoRow({ label, flagged = false, children }: { label: string; flagged?: boolean; children: ReactNode }) {
  return (
    <>
      <dt className="text-[0.95rem] text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-[0.95rem] font-semibold text-ink [overflow-wrap:anywhere]">
        {children}
        {flagged && (
          <span className="mt-0.5 flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
            <AlertTriangle className="size-3" aria-hidden="true" />
            Perlu dicek
          </span>
        )}
      </dd>
    </>
  );
}

function SoftIcon({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-sage text-primary", className)}>
      {children}
    </span>
  );
}

function DetailStatusPill({ needs, size = "md" }: { needs: boolean; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold",
        size === "sm" ? "px-2.5 py-0.5 text-[0.8rem]" : "px-3 py-1 text-sm",
        needs ? "border-amber-200 bg-amber-50 text-amber-800" : "border-primary/20 bg-primary-soft text-primary",
      )}
    >
      {needs ? <AlertTriangle className="size-4" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
      {needs ? STATUS_LABEL.NEEDS_VERIFICATION : STATUS_LABEL.VERIFIED}
    </span>
  );
}

/** Ikon nisan sederhana (lucide tidak menyediakan). */
function HeadstoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6.5 20V10a5.5 5.5 0 0 1 11 0v10" />
      <path d="M4 20h16" />
      <path d="M9.5 11h5M9.5 14.5h5" />
    </svg>
  );
}
