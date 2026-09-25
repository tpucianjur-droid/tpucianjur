"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { deleteGrave } from "@/lib/actions/graves";
import type { ActionResult } from "@/lib/actions/result";

type Props = {
  graveId: string;
  code: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** "danger" = outline (daftar), "dangerSolid" = tombol penuh (halaman Detail). */
  variant?: "danger" | "dangerSolid";
  label?: string;
  /**
   * Tujuan setelah berhasil dihapus (mis. daftar Data Makam dari halaman Detail).
   * Tanpa ini halaman saat ini cukup dimuat ulang.
   */
  redirectTo?: string;
  className?: string;
};

/**
 * Tombol Hapus + modal konfirmasi. Data TIDAK dihapus sebelum "Hapus Data" ditekan.
 * Selama proses: tombol nonaktif + spinner (cegah double submit), modal tidak dapat ditutup.
 * Gagal: pesan error di modal, halaman tetap utuh.
 */
export function DeleteGraveButton({ graveId, code, name, size = "sm", variant = "danger", label = "Hapus", redirectTo, className }: Props) {
  const router = useRouter();
  const toast = useToast();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (!pending) setOpen(false);
  };

  const confirm = () => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      let result: ActionResult;
      try {
        result = await deleteGrave(graveId);
      } catch {
        result = { status: "error", message: "Data makam belum berhasil dihapus. Periksa koneksi lalu coba lagi." };
      }
      if (result.status === "success") {
        setOpen(false);
        toast("Data makam berhasil dihapus.");
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
        return;
      }
      if (result.status === "error") {
        setError(result.message);
        toast(result.message, "error");
      }
    });
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        icon={<Trash2 className={size === "lg" ? "size-5" : "size-4"} aria-hidden="true" />}
      >
        {label}
        <span className="sr-only"> {name}</span>
      </Button>

      {open && (
        <dialog
          ref={(el) => {
            if (el && !el.open) el.showModal();
          }}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-ink shadow-(--shadow-lift) backdrop:bg-ink/45 backdrop:backdrop-blur-[2px]"
        >
          <div className="relative px-6 pb-6 pt-7 text-center">
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink disabled:opacity-40"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Tutup</span>
            </button>
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger-soft text-danger" aria-hidden="true">
              <Trash2 className="size-7" />
            </span>
            <h2 id={titleId} className="mt-4 text-xl font-bold">
              Hapus data makam?
            </h2>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
              Data <strong className="font-semibold text-ink">{code}</strong> — <strong className="font-semibold text-ink [overflow-wrap:anywhere]">{name}</strong> akan dihapus.
              <br />
              Tindakan ini tidak dapat dibatalkan.
            </p>
            {error && (
              <Alert tone="error" live className="mt-4 text-left">
                {error}
              </Alert>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" className="px-3" onClick={close} disabled={pending} autoFocus>
                Batal
              </Button>
              <Button
                variant="dangerSolid"
                size="lg"
                className="px-3"
                onClick={confirm}
                loading={pending}
                loadingText="Menghapus…"
                icon={<Trash2 className="size-5" aria-hidden="true" />}
              >
                Hapus Data
              </Button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
