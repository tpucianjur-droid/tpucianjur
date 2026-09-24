"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { setArchived } from "@/lib/actions/graves";

/** Arsip = soft delete: data tidak hilang, hanya disembunyikan dari publik dan daftar aktif. */
export function ArchiveButton({ graveId, archived }: { graveId: string; archived: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const onClick = () => {
    if (!archived && !window.confirm("Pindahkan data ini ke arsip? Data tidak dihapus dan dapat dikembalikan.")) return;
    startTransition(async () => {
      const result = await setArchived(graveId, !archived);
      if (result.status === "idle") return;
      setMessage({ tone: result.status, text: result.message });
      toast(result.message, result.status);
      if (result.status === "success") router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <Button
        variant={archived ? "secondary" : "danger"}
        size="lg"
        onClick={onClick}
        loading={pending}
        loadingText="Memproses…"
        icon={archived ? <ArchiveRestore className="size-5" aria-hidden="true" /> : <Archive className="size-5" aria-hidden="true" />}
      >
        {archived ? "Kembalikan dari arsip" : "Arsipkan data"}
      </Button>
      {message && (
        <Alert tone={message.tone} live>
          {message.text}
        </Alert>
      )}
    </div>
  );
}
