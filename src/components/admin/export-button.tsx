"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";

type Kind = "csv" | "pdf";

const LABEL: Record<Kind, { loading: string; success: string; fallbackName: string }> = {
  csv: { loading: "Mengekspor…", success: "Export Excel/CSV berhasil diunduh.", fallbackName: "data-makam.csv" },
  pdf: { loading: "Menyiapkan PDF…", success: "Export PDF berhasil diunduh.", fallbackName: "data-makam.pdf" },
};

/**
 * Menu Export: Excel/CSV (backup seluruh data, seperti sebelumnya) dan PDF (sesuai filter aktif).
 * File diunduh setelah server selesai menyusun data; tombol nonaktif + spinner selama proses.
 */
export function ExportMenu({ csvHref = "/admin/makam/export", pdfHref, className }: { csvHref?: string; pdfHref: string; className?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<Kind | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const download = async (kind: Kind) => {
    if (loading) return;
    setOpen(false);
    setLoading(kind);
    try {
      const response = await fetch(kind === "csv" ? csvHref : pdfHref, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? LABEL[kind].fallbackName;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(LABEL[kind].success);
    } catch {
      toast("Export gagal. Periksa koneksi lalu coba lagi.", "error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        variant="secondary"
        size="lg"
        onClick={() => setOpen((v) => !v)}
        loading={loading !== null}
        loadingText={loading ? LABEL[loading].loading : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        icon={<Download className="size-5" aria-hidden="true" />}
      >
        Export
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </Button>
      {open && (
        <div
          role="menu"
          aria-label="Pilih format export"
          className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-(--shadow-lift)"
        >
          <MenuItem onClick={() => download("csv")} icon={<FileSpreadsheet className="size-5" aria-hidden="true" />} hint="Seluruh data (backup)">
            Export Excel/CSV
          </MenuItem>
          <MenuItem onClick={() => download("pdf")} icon={<FileText className="size-5" aria-hidden="true" />} hint="A4 landscape, sesuai filter">
            Export PDF
          </MenuItem>
        </div>
      )}
      {loading && (
        <span className="sr-only" role="status">
          {LABEL[loading].loading}
        </span>
      )}
    </div>
  );
}

function MenuItem({ onClick, icon, hint, children }: { onClick: () => void; icon: ReactNode; hint: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left hover:bg-primary-soft focus-visible:bg-primary-soft"
    >
      <span className="text-primary">{icon}</span>
      <span>
        <span className="block font-semibold text-ink">{children}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </button>
  );
}
