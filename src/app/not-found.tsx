import { Compass } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-16">
      <EmptyState
        icon={<Compass className="size-6" />}
        title="Halaman tidak ditemukan"
        action={<LinkButton href="/">Kembali ke Beranda</LinkButton>}
      >
        Alamat yang Anda buka tidak tersedia.
      </EmptyState>
    </main>
  );
}
