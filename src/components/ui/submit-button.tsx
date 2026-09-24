"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

type Props = Omit<ComponentProps<typeof Button>, "type" | "loading"> & { loadingText: ReactNode; pending?: boolean };

/**
 * Tombol submit yang otomatis menampilkan spinner & nonaktif selama form (Server Action / next/form)
 * diproses — mencegah double submit tanpa state tambahan di form induk.
 */
export function SubmitButton({ pending, ...props }: Props) {
  const status = useFormStatus();
  return <Button type="submit" loading={Boolean(pending) || status.pending} {...props} />;
}
