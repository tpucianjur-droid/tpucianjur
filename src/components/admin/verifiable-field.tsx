"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Check, Flag } from "lucide-react";
import { FieldMessage, Label } from "@/components/ui/field";

/**
 * Field dengan status verifikasi. Perlu dicek => merah + ikon + teks + tombol "Tandai sudah benar".
 * Sudah benar => tampil normal (tanpa warna khusus).
 */
export function VerifiableField({
  id,
  label,
  required,
  flagged,
  flagHint,
  error,
  hint,
  onVerify,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  flagged: boolean;
  flagHint: string;
  error?: string;
  hint?: ReactNode;
  onVerify: () => void;
  children: ReactNode;
}) {
  return (
    <div data-flagged={flagged || undefined}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="relative">
        {children}
        {flagged && (
          <AlertTriangle className="pointer-events-none absolute right-4 top-3.5 size-5 text-danger" aria-hidden="true" />
        )}
      </div>
      {error ? (
        <FieldMessage id={`${id}-msg`} error={error} />
      ) : flagged ? (
        <div id={`${id}-msg`} className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[0.95rem] font-semibold text-danger">
            <Flag className="size-4" aria-hidden="true" />
            {flagHint}
          </p>
          <button
            type="button"
            onClick={onVerify}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-4 font-semibold text-primary hover:bg-sage-strong"
          >
            <Check className="size-4" aria-hidden="true" />
            Tandai sudah benar
          </button>
        </div>
      ) : (
        <FieldMessage id={`${id}-msg`} hint={hint} />
      )}
    </div>
  );
}
