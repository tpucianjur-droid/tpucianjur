"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Export CSV dengan umpan balik proses (spinner) — file diunduh setelah server selesai menyusun data. */
export function ExportButton({ href = "/admin/makam/export" }: { href?: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const response = await fetch(href, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? "data-makam.csv";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Export CSV berhasil diunduh.");
    } catch {
      toast("Export gagal. Periksa koneksi lalu coba lagi.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="lg"
      onClick={onClick}
      loading={loading}
      loadingText="Mengekspor…"
      icon={<Download className="size-5" aria-hidden="true" />}
    >
      Export CSV
    </Button>
  );
}
