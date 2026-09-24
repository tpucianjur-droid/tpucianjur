"use client";

import { RotateCcw } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

export default function AdminError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="py-10">
      <EmptyState
        icon={<RotateCcw className="size-6" />}
        title="Data belum dapat dimuat. Coba lagi."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={() => retry()}>
              Coba lagi
            </Button>
            <LinkButton href="/admin" variant="secondary" size="lg">
              Ke Dashboard
            </LinkButton>
          </div>
        }
      >
        Periksa koneksi internet. Jika masalah berlanjut, keluar lalu masuk kembali.
      </EmptyState>
    </div>
  );
}
