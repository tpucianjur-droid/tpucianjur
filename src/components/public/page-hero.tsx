import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { PageHeaderCover } from "./responsive-cover";

export type Crumb = { href?: string; label: string };

export function PageHero({
  eyebrow,
  title,
  accent,
  description,
  crumbs,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  description?: string;
  crumbs?: Crumb[];
}) {
  return (
    <section className="relative overflow-hidden border-b border-line/60 bg-white">
      <div className="pointer-events-none absolute inset-0">
        <PageHeaderCover className="object-[70%_center]" />
        <div className="absolute inset-0 bg-linear-to-b from-white/95 via-white/85 to-white/60 md:bg-linear-to-r md:from-white md:via-white/80 md:to-white/10" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:pb-20 md:pt-12">
        {crumbs && crumbs.length > 0 && <Breadcrumbs crumbs={crumbs} />}
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="max-w-xl font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
          {title}
          {accent && <span className="block text-2xl text-gold sm:text-3xl">{accent}</span>}
        </h1>
        {description && <p className="mt-4 max-w-lg text-lg text-muted">{description}</p>}
      </div>
    </section>
  );
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <li>
          <Link href="/" className="inline-flex min-h-8 items-center gap-1 hover:text-primary">
            <Home className="size-4" aria-hidden="true" />
            Beranda
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.label} className="flex items-center gap-1">
            <ChevronRight className="size-4" aria-hidden="true" />
            {crumb.href ? (
              <Link href={crumb.href} className="inline-flex min-h-8 items-center hover:text-primary">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
