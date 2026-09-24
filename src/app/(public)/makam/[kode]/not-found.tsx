import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { MESSAGES } from "@/lib/config";

export default function GraveNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={<SearchX className="size-6" />}
        title={MESSAGES.notFound}
        action={<LinkButton href="/cari-makam">Cari Makam</LinkButton>}
      >
        Kode makam tidak terdaftar atau data belum ditampilkan untuk publik. Coba cari berdasarkan nama.
      </EmptyState>
    </div>
  );
}
