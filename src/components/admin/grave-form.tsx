"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import {
  Camera,
  Check,
  CheckCheck,
  ClipboardCheck,
  Flag,
  MapPin,
  Save,
  User,
  Users,
  X,
} from "lucide-react";
import { removeGravePhoto, saveGrave, uploadGravePhoto } from "@/lib/actions/graves";
import { IDLE } from "@/lib/actions/result";
import { runSaveFlow } from "@/lib/admin/save-flow";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, IconBadge } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { DenahSkeleton } from "@/components/ui/skeletons";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { FieldMessage, inputClass, Label } from "@/components/ui/field";
import type { AdminBlock, AdminGrave } from "@/lib/data/admin";
import { formatGraveCode } from "@/lib/graves/code";
import {
  computeVerificationStatus,
  flaggedFields,
  pickFlags,
  VERIFY_FIELDS,
  type VerificationFlags,
  type VerifyFieldKey,
} from "@/lib/graves/verification";
import { formDataToObject, graveFormSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import type { MapGrave } from "@/components/denah/grave-map";
import { StatusBadge } from "./admin-ui";
import { PhotoPicker, type PhotoChange, type PhotoPhase } from "./photo-picker";
import { VerifiableField } from "./verifiable-field";

const GraveMap = dynamic(() => import("@/components/denah/grave-map").then((m) => m.GraveMap), {
  ssr: false,
  loading: () => <DenahSkeleton className="h-80" />,
});

export type Notice = { tone: "success" | "warning" | "error"; message: string };

type Props = {
  grave: AdminGrave | null;
  blocks: AdminBlock[];
  blockGraves: MapGrave[];
  photoUrl: string | null;
  /** Daftar Data Makam (dengan filter sebelumnya). Setelah Simpan/Verifikasi berhasil, pengguna kembali ke sini. */
  backHref: string;
  initialNotices?: Notice[];
  suggestedNumber?: number | null;
};

export function GraveForm({
  grave,
  blocks,
  blockGraves,
  photoUrl,
  backHref,
  initialNotices = [],
  suggestedNumber = null,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [submitIntent, setSubmitIntent] = useState<"save" | "save-verify" | null>(null);
  const [photoPhase, setPhotoPhase] = useState<PhotoPhase>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notices, setNotices] = useState<Notice[]>(initialNotices);
  const [flags, setFlags] = useState<VerificationFlags>(() => pickFlags(grave ?? {}));
  const [photo, setPhoto] = useState<PhotoChange>({ kind: "keep" });

  const defaultBlock = grave?.block_id ?? blocks.find((b) => b.is_active)?.id ?? "";
  const [blockId, setBlockId] = useState(defaultBlock);
  const [name, setName] = useState(grave?.deceased_name ?? "");
  const [number, setNumber] = useState(
    grave?.grave_number != null ? String(grave.grave_number) : suggestedNumber ? String(suggestedNumber) : "",
  );
  const [row, setRow] = useState(grave?.visual_row != null ? String(grave.visual_row) : "");
  const [column, setColumn] = useState(grave?.visual_column != null ? String(grave.visual_column) : "");
  const [showPicker, setShowPicker] = useState(false);

  const block = blocks.find((b) => b.id === blockId) ?? null;
  const numberValue = Number.parseInt(number, 10);
  const codePreview = block && Number.isInteger(numberValue) && numberValue > 0 ? formatGraveCode(block.code, numberValue) : "—";
  const status = computeVerificationStatus(flags);
  const flagged = flaggedFields(flags);
  const setFlag = (key: VerifyFieldKey, value: boolean) => setFlags((current) => ({ ...current, [key]: value }));

  const pickerGraves = useMemo<MapGrave[]>(() => {
    const self: MapGrave = {
      id: grave?.id ?? "__baru__",
      grave_code: codePreview,
      deceased_name: name || "Makam ini",
      grave_number: Number.isInteger(numberValue) ? numberValue : null,
      visual_row: row ? Number(row) : null,
      visual_column: column ? Number(column) : null,
      visual_x: grave?.visual_x ?? null,
      visual_y: grave?.visual_y ?? null,
    };
    return [...blockGraves.filter((g) => g.id !== self.id), self];
  }, [blockGraves, grave, codePreview, name, numberValue, row, column]);

  const pickerAvailable = grave ? blockId === grave.block_id : blockGraves.length === 0 || blockId === defaultBlock;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value === "save-verify" ? "save-verify" : "save";
    if (
      intent === "save-verify" &&
      flagged.length > 0 &&
      !window.confirm(`Tandai ${flagged.length} field yang masih merah sebagai SUDAH BENAR lalu simpan?`)
    ) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("intent", intent);

    // Validasi klien untuk umpan balik cepat (server tetap memvalidasi ulang).
    const parsed = graveFormSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) {
      showErrors(toFieldErrors(parsed.error), "Beberapa data belum benar. Periksa kolom yang ditandai.");
      return;
    }

    setErrors({});
    setNotices([]);
    setSubmitIntent(intent);
    startTransition(async () => {
      const flow = await runSaveFlow({
        save: () => saveGrave(IDLE, formData),
        uploadPhoto:
          photo.kind === "replace"
            ? (id) => {
                setPhotoPhase("uploading");
                const photoData = new FormData();
                photoData.append("photo", photo.photo.blob, photo.photo.type === "image/webp" ? "foto.webp" : "foto.jpg");
                return uploadGravePhoto(id, photoData);
              }
            : undefined,
        removePhoto:
          photo.kind === "remove"
            ? (id) => {
                setPhotoPhase("removing");
                return removeGravePhoto(id);
              }
            : undefined,
      });
      setPhotoPhase(null);

      if (flow.result.status === "error") {
        showErrors(flow.result.fieldErrors ?? {}, flow.result.message);
        return;
      }
      if (flow.result.status !== "success" || !flow.result.data) return;

      // Berhasil: toast lalu kembali ke Data Makam (filter sebelumnya dipertahankan). Daftar dimuat ulang dari server
      // karena action sudah me-revalidate /admin. Tombol tetap nonaktif sampai halaman daftar tampil.
      announceSaved(intent, flow.photo, flow.photoMessage);
      router.push(backHref);
    });
  };

  /** Toast hasil simpan: data utama + status foto (foto gagal tidak membatalkan data). */
  function announceSaved(intent: "save" | "save-verify", photoOutcome: string, photoMessage?: string) {
    const main = intent === "save-verify" ? "Data makam berhasil diverifikasi." : "Data makam berhasil disimpan.";
    toast(main);
    if (photoOutcome === "failed") toast(photoMessage ?? "Foto gagal diunggah.", "warning");
    if (photoOutcome === "uploaded") toast("Foto berhasil diunggah.");
    if (photoOutcome === "removed") toast("Foto berhasil dihapus.");
  }

  function showErrors(fieldErrors: FieldErrors, message: string) {
    setErrors(fieldErrors);
    setNotices([{ tone: "error", message }]);
    toast(message, "error");
    const first = Object.keys(fieldErrors)[0];
    if (first) window.requestAnimationFrame(() => document.getElementById(`f-${first}`)?.focus());
  }

  const describe = (key: string) => (errors[key] ? `f-${key}-msg` : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <input type="hidden" name="id" value={grave?.id ?? ""} />
      {VERIFY_FIELDS.map((field) => (
        <input key={field.key} type="hidden" name={field.key} value={flags[field.key] ? "on" : ""} />
      ))}

      <div className="space-y-3" aria-live="polite">
        {notices.map((notice, index) => (
          <Alert key={index} tone={notice.tone} live>
            {notice.message}
          </Alert>
        ))}
      </div>

      {flagged.length > 0 && (
        <Card className="border-danger/40 bg-danger-soft/60 p-5">
          <p className="flex items-center gap-2 text-lg font-bold text-danger">
            <Flag className="size-5" aria-hidden="true" />
            {flagged.length} field perlu verifikasi
          </p>
          <p className="mt-1 text-[0.95rem]">Cocokkan dengan catatan asli, perbaiki bila perlu, lalu tekan “Tandai sudah benar”.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {flagged.map((field) => (
              <li key={field.key} className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-danger">
                {field.label}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* A. Informasi Jenazah */}
      <Section icon={<User className="size-5" />} title="A. Informasi Jenazah" description="Data utama orang yang dimakamkan.">
        <VerifiableField
          id="f-deceased_name"
          label="Nama yang dimakamkan"
          required
          flagged={flags.verify_deceased_name}
          flagHint="Perlu verifikasi ejaan nama"
          error={errors.deceased_name}
          onVerify={() => setFlag("verify_deceased_name", false)}
        >
          <input
            id="f-deceased_name"
            name="deceased_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={200}
            autoComplete="off"
            aria-invalid={errors.deceased_name ? true : undefined}
            aria-describedby="f-deceased_name-msg"
            className={inputClass(Boolean(errors.deceased_name), flags.verify_deceased_name)}
          />
        </VerifiableField>

        <div className="grid gap-5 md:grid-cols-2">
          <VerifiableField
            id="f-death_date"
            label="Tanggal wafat"
            flagged={flags.verify_death_date}
            flagHint="Perlu verifikasi tanggal wafat"
            error={errors.death_date}
            hint={grave?.recorded_date_raw ? `Tertulis di catatan asli: ${grave.recorded_date_raw}` : "Kosongkan bila belum diketahui."}
            onVerify={() => setFlag("verify_death_date", false)}
          >
            <input
              id="f-death_date"
              name="death_date"
              type="date"
              defaultValue={grave?.death_date ?? ""}
              aria-invalid={errors.death_date ? true : undefined}
              aria-describedby="f-death_date-msg"
              className={inputClass(Boolean(errors.death_date), flags.verify_death_date)}
            />
          </VerifiableField>
          <div>
            <Label htmlFor="f-date_semantics">Arti tanggal</Label>
            <select
              id="f-date_semantics"
              name="date_semantics"
              defaultValue={grave?.date_semantics ?? "WAFAT"}
              className={inputClass(Boolean(errors.date_semantics))}
            >
              <option value="WAFAT">Tanggal wafat (sudah pasti)</option>
              <option value="BELUM_DIPASTIKAN">Belum dipastikan (bisa tanggal lahir/lainnya)</option>
            </select>
            <FieldMessage id="f-date_semantics-msg" error={errors.date_semantics} hint="Tanggal “belum dipastikan” tidak ditampilkan ke publik sebagai tanggal wafat bila kosong." />
          </div>
        </div>
      </Section>

      {/* B. Informasi Ahli Waris */}
      <Section icon={<Users className="size-5" />} title="B. Informasi Ahli Waris" description="Data internal — tidak pernah tampil di halaman publik.">
        <div className="grid gap-5 md:grid-cols-2">
          <VerifiableField
            id="f-heir_name"
            label="Nama ahli waris"
            flagged={flags.verify_heir_name}
            flagHint="Perlu verifikasi nama ahli waris"
            error={errors.heir_name}
            onVerify={() => setFlag("verify_heir_name", false)}
          >
            <input
              id="f-heir_name"
              name="heir_name"
              defaultValue={grave?.heir_name ?? ""}
              maxLength={200}
              autoComplete="off"
              aria-invalid={errors.heir_name ? true : undefined}
              aria-describedby="f-heir_name-msg"
              className={inputClass(Boolean(errors.heir_name), flags.verify_heir_name)}
            />
          </VerifiableField>
          <VerifiableField
            id="f-heir_phone"
            label="Telepon ahli waris"
            flagged={flags.verify_heir_phone}
            flagHint="Perlu verifikasi nomor telepon"
            error={errors.heir_phone}
            hint="Contoh: 0812 3456 7890"
            onVerify={() => setFlag("verify_heir_phone", false)}
          >
            <input
              id="f-heir_phone"
              name="heir_phone"
              type="tel"
              inputMode="tel"
              defaultValue={grave?.heir_phone ?? ""}
              maxLength={30}
              autoComplete="off"
              aria-invalid={errors.heir_phone ? true : undefined}
              aria-describedby="f-heir_phone-msg"
              className={inputClass(Boolean(errors.heir_phone), flags.verify_heir_phone)}
            />
          </VerifiableField>
        </div>
        <VerifiableField
          id="f-heir_address"
          label="Alamat ahli waris"
          flagged={flags.verify_heir_address}
          flagHint="Alamat ahli waris perlu diverifikasi"
          error={errors.heir_address}
          onVerify={() => setFlag("verify_heir_address", false)}
        >
          <textarea
            id="f-heir_address"
            name="heir_address"
            defaultValue={grave?.heir_address ?? ""}
            maxLength={500}
            rows={3}
            aria-invalid={errors.heir_address ? true : undefined}
            aria-describedby="f-heir_address-msg"
            className={cn(inputClass(Boolean(errors.heir_address), flags.verify_heir_address), "py-3")}
          />
        </VerifiableField>
      </Section>

      {/* C. Lokasi Makam */}
      <Section icon={<MapPin className="size-5" />} title="C. Lokasi Makam" description="Blok dan nomor makam. Kode makam dibuat otomatis.">
        <div className="grid gap-5 md:grid-cols-3">
          <VerifiableField
            id="f-block_id"
            label="Blok"
            required
            flagged={flags.verify_location}
            flagHint="Perlu verifikasi blok & nomor"
            error={errors.block_id}
            onVerify={() => setFlag("verify_location", false)}
          >
            <select
              id="f-block_id"
              name="block_id"
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              required
              aria-invalid={errors.block_id ? true : undefined}
              aria-describedby="f-block_id-msg"
              className={inputClass(Boolean(errors.block_id), flags.verify_location)}
            >
              <option value="">Pilih blok</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.is_active ? "" : " (nonaktif)"}
                </option>
              ))}
            </select>
          </VerifiableField>
          <div>
            <Label htmlFor="f-grave_number" required>
              Nomor makam
            </Label>
            <input
              id="f-grave_number"
              name="grave_number"
              type="number"
              inputMode="numeric"
              min={1}
              max={99999}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
              aria-invalid={errors.grave_number ? true : undefined}
              aria-describedby="f-grave_number-msg"
              className={inputClass(Boolean(errors.grave_number), flags.verify_location)}
            />
            <FieldMessage id="f-grave_number-msg" error={errors.grave_number} hint="Boleh diubah bila perlu." />
          </div>
          <div>
            <p className="mb-2 block text-[0.95rem] font-semibold">Kode makam</p>
            <p className="flex min-h-12 items-center rounded-xl border border-dashed border-line bg-surface px-4 text-lg font-bold" aria-live="polite">
              {codePreview}
            </p>
            <p className="mt-2 text-[0.9rem] text-muted">Otomatis dari blok + nomor.</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface/60 p-4">
          <p className="font-semibold">Posisi di denah</p>
          <p className="mb-3 text-[0.95rem] text-muted">
            Kosongkan baris & kolom untuk posisi otomatis berdasarkan nomor (simulasi). Isi bila posisi di lapangan berbeda.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="f-visual_row">Baris</Label>
              <input
                id="f-visual_row"
                name="visual_row"
                type="number"
                inputMode="numeric"
                min={1}
                max={500}
                value={row}
                onChange={(e) => setRow(e.target.value)}
                aria-describedby={describe("visual_row")}
                className={inputClass(Boolean(errors.visual_row))}
              />
              <FieldMessage id="f-visual_row-msg" error={errors.visual_row} />
            </div>
            <div>
              <Label htmlFor="f-visual_column">Kolom</Label>
              <input
                id="f-visual_column"
                name="visual_column"
                type="number"
                inputMode="numeric"
                min={1}
                max={500}
                value={column}
                onChange={(e) => setColumn(e.target.value)}
                aria-describedby={describe("visual_column")}
                className={inputClass(Boolean(errors.visual_column))}
              />
              <FieldMessage id="f-visual_column-msg" error={errors.visual_column} />
            </div>
            <div className="flex items-end sm:col-span-2">
              <button
                type="button"
                className={buttonClass("secondary", "lg", "w-full")}
                onClick={() => setShowPicker((v) => !v)}
                disabled={!pickerAvailable || !block}
                aria-expanded={showPicker}
              >
                <MapPin className="size-5" aria-hidden="true" />
                {showPicker ? "Tutup denah" : "Pilih posisi di denah"}
              </button>
            </div>
          </div>
          {!pickerAvailable && (
            <p className="mt-2 text-sm text-muted">Blok diubah: simpan dahulu, lalu pilih posisi di blok yang baru.</p>
          )}

          <details className="mt-3">
            <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-primary">
              Lanjutan: posisi bebas (X/Y)
            </summary>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="f-visual_x">Posisi X (kolom, boleh desimal)</Label>
                <input
                  id="f-visual_x"
                  name="visual_x"
                  inputMode="decimal"
                  defaultValue={grave?.visual_x ?? ""}
                  aria-describedby={describe("visual_x")}
                  className={inputClass(Boolean(errors.visual_x))}
                />
                <FieldMessage id="f-visual_x-msg" error={errors.visual_x} />
              </div>
              <div>
                <Label htmlFor="f-visual_y">Posisi Y (baris, boleh desimal)</Label>
                <input
                  id="f-visual_y"
                  name="visual_y"
                  inputMode="decimal"
                  defaultValue={grave?.visual_y ?? ""}
                  aria-describedby={describe("visual_y")}
                  className={inputClass(Boolean(errors.visual_y))}
                />
                <FieldMessage id="f-visual_y-msg" error={errors.visual_y} />
              </div>
            </div>
          </details>

          {showPicker && pickerAvailable && block && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted">Klik petak kosong untuk memindahkan makam ini. Makam ini ditandai hijau.</p>
              <GraveMap
                block={block}
                graves={pickerGraves}
                targetId={grave?.id ?? "__baru__"}
                editable
                onSelectCell={(x, y) => {
                  setColumn(String(x));
                  setRow(String(y));
                }}
                className="h-80"
                ariaLabel={`Denah ${block.name} untuk memilih posisi makam`}
              />
            </div>
          )}
        </div>
      </Section>

      {/* D. Foto */}
      <Section icon={<Camera className="size-5" />} title="D. Foto Makam (opsional)" description="Tanpa foto, data tetap dapat disimpan.">
        <PhotoPicker currentUrl={photoUrl} name={name} value={photo} onChange={setPhoto} phase={photoPhase} disabled={pending} />
      </Section>

      {/* E. Status Verifikasi */}
      <Section icon={<ClipboardCheck className="size-5" />} title="E. Status Verifikasi" description="Status hanya terlihat oleh Admin.">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold">Status data:</span>
          <StatusBadge status={status} />
        </div>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {VERIFY_FIELDS.map((field) => {
            const isFlagged = flags[field.key];
            return (
              <li key={field.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className={cn("font-medium", isFlagged && "text-danger")}>
                  {field.label}
                  <span className={cn("ml-2 text-sm", isFlagged ? "font-semibold text-danger" : "text-muted")}>
                    {isFlagged ? "— perlu dicek" : "— sudah benar"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setFlag(field.key, !isFlagged)}
                  aria-pressed={!isFlagged}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-[0.95rem] font-semibold",
                    isFlagged ? "border-primary/30 bg-primary-soft text-primary" : "border-line bg-white text-muted hover:text-danger",
                  )}
                >
                  {isFlagged ? <Check className="size-4" aria-hidden="true" /> : <Flag className="size-4" aria-hidden="true" />}
                  {isFlagged ? "Tandai sudah benar" : "Tandai perlu dicek"}
                </button>
              </li>
            );
          })}
        </ul>

        <div>
          <Label htmlFor="f-transcription_notes">Catatan verifikasi</Label>
          <textarea
            id="f-transcription_notes"
            name="transcription_notes"
            defaultValue={grave?.transcription_notes ?? ""}
            rows={3}
            maxLength={1000}
            aria-describedby="f-transcription_notes-msg"
            className={cn(inputClass(Boolean(errors.transcription_notes)), "py-3")}
          />
          <FieldMessage
            id="f-transcription_notes-msg"
            error={errors.transcription_notes}
            hint={
              grave?.source_file
                ? `Sumber: ${grave.source_file}${grave.transcription_confidence ? ` · keyakinan transkripsi: ${grave.transcription_confidence}` : ""}`
                : undefined
            }
          />
        </div>

        <label htmlFor="f-is_public" className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-4 py-3">
          <input
            id="f-is_public"
            name="is_public"
            type="checkbox"
            defaultChecked={grave?.is_public ?? true}
            className="mt-0.5 size-5 shrink-0 accent-(--color-primary)"
          />
          <span>
            <span className="block font-semibold">Tampilkan di halaman publik</span>
            <span className="block text-[0.9rem] text-muted">Nama, tanggal wafat, blok, nomor, kode, denah, dan foto. Data ahli waris tidak pernah tampil.</span>
          </span>
        </label>
      </Section>

      <div className="fixed inset-x-0 bottom-(--app-nav-space) z-30 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgb(21_54_45/0.05)] backdrop-blur lg:left-72">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          <Link href={backHref} className={buttonClass("ghost", "lg", "mr-auto max-sm:hidden")}>
            <X className="size-5" aria-hidden="true" />
            Batal
          </Link>
          <Button
            type="submit"
            name="intent"
            value="save"
            variant="soft"
            size="lg"
            className="max-sm:px-3"
            disabled={pending}
            loading={pending && submitIntent === "save"}
            loadingText="Menyimpan…"
            icon={<Save className="size-5" aria-hidden="true" />}
          >
            Simpan
          </Button>
          <Button
            type="submit"
            name="intent"
            value="save-verify"
            size="lg"
            className="max-sm:px-3"
            disabled={pending}
            loading={pending && submitIntent === "save-verify"}
            loadingText="Memverifikasi…"
            icon={<CheckCheck className="size-5 max-sm:hidden" aria-hidden="true" />}
          >
            Simpan &amp; Verifikasi
          </Button>
        </div>
      </div>
    </form>
  );
}
function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <IconBadge>{icon}</IconBadge>
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-[0.95rem] text-muted">{description}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}
