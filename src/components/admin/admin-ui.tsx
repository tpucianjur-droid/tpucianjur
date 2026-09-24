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
export function StatusBadge({ status }: { status: string }) {
  const needs = status === "NEEDS_VERIFICATION";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold",
        needs ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary",
      )}
    >
      {needs ? <AlertTriangle className="size-4" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
      {needs ? STATUS_LABEL.NEEDS_VERIFICATION : STATUS_LABEL.VERIFIED}
    </span>
  );
}

/** Daftar field yang masih perlu dicek (chip merah). */
export function FlaggedChips({ record }: { record: Partial<Record<VerifyFieldKey, boolean | null>> }) {
  const fields = flaggedFields(pickFlags(record));
  if (fields.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Field yang perlu dicek">
      {fields.map((field) => (
        <li key={field.key} className="rounded-full border border-danger/30 bg-danger-soft px-2.5 py-0.5 text-sm font-medium text-danger">
          {field.label}
        </li>
      ))}
    </ul>
  );
}
