import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LinkPendingIcon } from "@/components/ui/link-status";
import { cn } from "@/components/ui/cn";
import { pageList } from "@/lib/admin/pagination";

/** Paginasi bernomor (HP: sebelumnya/berikutnya + "x dari y"). */
export function Pagination({
  page,
  total,
  pageSize,
  buildHref,
}: {
  page: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const square = "inline-flex size-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors";
  return (
    <nav aria-label="Halaman" className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted">
        Menampilkan {from}–{to} dari {total} data
      </p>
      <div className="flex items-center gap-1.5">
        <PageArrow href={page > 1 ? buildHref(page - 1) : null} label="Halaman sebelumnya">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </PageArrow>
        <span className="px-2 text-sm font-semibold sm:hidden">
          {page} dari {pages}
        </span>
        <ul className="hidden items-center gap-1.5 sm:flex">
          {pageList(page, pages).map((p, i) =>
            p === null ? (
              <li key={`gap${i}`} className="w-6 text-center text-muted" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={p}>
                {p === page ? (
                  <span aria-current="page" className={cn(square, "border-primary bg-primary text-white")}>
                    {p}
                  </span>
                ) : (
                  <Link href={buildHref(p)} className={cn(square, "border-line bg-white text-ink hover:border-primary/40 hover:bg-primary-soft")}>
                    <span className="sr-only">Halaman </span>
                    {p}
                  </Link>
                )}
              </li>
            ),
          )}
        </ul>
        <PageArrow href={page < pages ? buildHref(page + 1) : null} label="Halaman berikutnya">
          <ChevronRight className="size-5" aria-hidden="true" />
        </PageArrow>
      </div>
    </nav>
  );
}

function PageArrow({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  const cls = "inline-flex size-10 items-center justify-center rounded-lg border border-line bg-white text-ink";
  if (!href) {
    return (
      <span className={cn(cls, "opacity-40")} aria-disabled="true">
        {children}
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <Link href={href} className={cn(cls, "hover:border-primary/40 hover:bg-primary-soft")}>
      <LinkPendingIcon icon={children} />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
