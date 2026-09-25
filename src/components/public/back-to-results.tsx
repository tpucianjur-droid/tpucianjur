"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowLeft } from "lucide-react";

const STORAGE_KEY = "tpu:last-search";
const FALLBACK = "/cari-makam";

/** Dipanggil halaman Cari Makam setiap URL pencarian berubah, agar Detail bisa kembali ke hasil yang sama. */
export function rememberLastSearch(url: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, url);
  } catch {
    // Storage diblokir -> tombol kembali memakai /cari-makam.
  }
}

function readLastSearch() {
  try {
    const url = window.sessionStorage.getItem(STORAGE_KEY);
    return url && url.startsWith(FALLBACK) ? url : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

const noopSubscribe = () => () => {};

/** Kembali ke hasil pencarian terakhir (kata kunci tetap); tanpa riwayat -> halaman Cari Makam. */
export function BackToResults() {
  const href = useSyncExternalStore(noopSubscribe, readLastSearch, () => FALLBACK);
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 text-[0.95rem] text-muted transition-colors hover:text-primary"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Kembali ke Hasil Pencarian
    </Link>
  );
}
