"use client";

import { RotateCcw } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { MESSAGES } from "@/lib/config";

export default function PublicError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={<RotateCcw className="size-6" />}
        title={MESSAGES.loadFailed}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => retry()}>Coba lagi</Button>
            <LinkButton href="/" variant="secondary">
              Ke Beranda
            </LinkButton>
          </div>
        }
      >
        Periksa koneksi internet Anda. Jika masalah berlanjut, coba beberapa saat lagi.
      </EmptyState>
    </div>
  );
}
