import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { formatNumber } from "@/lib/format";

type Tone = "primary" | "danger" | "success" | "gold";

const TONES: Record<Tone, { icon: string; note: string; chevron: string }> = {
  primary: { icon: "bg-primary text-white", note: "text-primary", chevron: "bg-sage text-primary" },
  danger: { icon: "bg-danger text-white", note: "text-danger", chevron: "bg-danger-soft text-danger" },
  success: { icon: "bg-chart-green text-white", note: "text-chart-green", chevron: "bg-sage text-chart-green" },
  gold: { icon: "bg-gold text-white", note: "text-gold", chevron: "bg-gold-soft text-gold" },
};

/** Kartu KPI: ikon bulat, label, angka besar, catatan singkat, dan tautan ke halaman terkait. */
export function KpiCard({
  icon,
  label,
  value,
  highlight,
  note,
  tone,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  /** Bagian catatan yang ditonjolkan (mis. persentase). */
  highlight?: string;
  note: string;
  tone: Tone;
  href: string;
}) {
  const style = TONES[tone];
  return (
    <Link
      href={href}
      className="group flex h-full min-w-0 items-start gap-3.5 rounded-2xl border border-line/70 bg-white p-5 shadow-(--shadow-card) transition-shadow duration-200 hover:shadow-(--shadow-lift) xl:max-2xl:p-4"
    >
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full xl:max-2xl:size-11", style.icon)} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink/85">{label}</span>
        <span className={cn("block text-[2rem] font-bold leading-tight tabular-nums", tone === "danger" ? "text-danger" : "text-ink")}>
          {formatNumber(value)}
        </span>
        <span className="mt-1 flex items-end justify-between gap-2">
          <span className="text-sm text-muted xl:max-2xl:text-[0.8125rem]">
            {highlight && <strong className={cn("font-semibold", style.note)}>{highlight} </strong>}
            {note}
          </span>
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5 xl:max-2xl:hidden",
              style.chevron,
            )}
            aria-hidden="true"
          >
            <ChevronRight className="size-4" />
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Panel putih dengan judul & tautan opsional (chart / tabel Dashboard). */
export function Panel({
  title,
  subtitle,
  link,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border border-line/70 bg-white p-5 shadow-(--shadow-card)", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {link && (
          <Link
            href={link.href}
            className="inline-flex min-h-9 shrink-0 items-center gap-0.5 rounded-lg px-1 text-sm font-semibold text-primary hover:underline"
          >
            {link.label}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

/** Tabel ringkas bergaya Dashboard (header abu muda, baris hairline). */
export function MiniTable({
  head,
  children,
  minWidth,
  alignRight = [],
  wideOnly = [],
}: {
  head: ReactNode[];
  children: ReactNode;
  minWidth?: string;
  /** Indeks kolom angka (rata kanan). */
  alignRight?: number[];
  /** Indeks kolom yang hanya tampil bila panel cukup lebar (container ≥ 28rem). */
  wideOnly?: number[];
}) {
  return (
    <div className="@container -mx-1 overflow-x-auto px-1">
      <table className="w-full text-left text-sm" style={minWidth ? { minWidth } : undefined}>
        <thead>
          <tr className="bg-surface text-xs font-semibold text-ink/80">
            {head.map((cell, i) => (
              <th
                key={i}
                scope="col"
                className={cn("px-3 py-2.5 font-semibold first:rounded-l-lg last:rounded-r-lg", alignRight.includes(i) && "text-right", wideOnly.includes(i) && "hidden @md:table-cell")}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">{children}</tbody>
      </table>
    </div>
  );
}
