"use client";

import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import { Spinner } from "./spinner";

/**
 * Ikon di dalam <Link> yang berubah menjadi spinner selama halaman tujuan dimuat.
 * Ukuran tetap sama sehingga tidak ada layout shift (mis. tombol paginasi).
 */
export function LinkPendingIcon({ icon, className = "size-5" }: { icon: ReactNode; className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className={className} /> : <>{icon}</>;
}
