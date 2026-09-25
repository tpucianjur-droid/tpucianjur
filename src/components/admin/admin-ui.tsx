import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { flaggedFields, pickFlags, STATUS_LABEL, type VerifyFieldKey } from "@/lib/graves/verification";

export function AdminPageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: string;
  description?: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back && (
          <Link href={back.href} className="mb-2 inline-flex min-h-10 items-center gap-2 text-[0.95rem] font-medium text-primary hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-[1.0625rem] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Status record: merah + ikon + teks untuk "Perlu Verifikasi" (tidak hanya warna). */
export function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const needs = status === "NEEDS_VERIFICATION";
  const icon = compact ? "size-3.5" : "size-4";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
        compact ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        needs ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary",
      )}
    >
      {needs ? <AlertTriangle className={icon} aria-hidden="true" /> : <CheckCircle2 className={icon} aria-hidden="true" />}
      {needs ? STATUS_LABEL.NEEDS_VERIFICATION : STATUS_LABEL.VERIFIED}
    </span>
  );
}

/** Ringkasan singkat field yang perlu dicek (untuk tabel/kartu yang padat). */
export function FlagSummary({ record, className }: { record: Partial<Record<VerifyFieldKey, boolean | null>>; className?: string }) {
  const fields = flaggedFields(pickFlags(record));
  if (fields.length === 0) return null;
  const labels = fields.map((f) => f.label).join(", ");
  return (
    <p className={cn("text-xs font-medium leading-snug text-danger", className)} title={labels}>
      {fields.length} field perlu dicek<span className="sr-only">: {labels}</span>
    </p>
  );
}
