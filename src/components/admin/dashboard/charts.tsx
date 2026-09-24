import { cn } from "@/components/ui/cn";
import { niceAxis } from "@/lib/dashboard/stats";
import { formatNumber } from "@/lib/format";

/**
 * Chart Dashboard ringan: SVG/HTML murni, dirender di server, tanpa library & tanpa JavaScript klien.
 * Hover/ketuk memunculkan tooltip lewat CSS (group-hover / focus-within).
 */

const PERCENT = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const formatPercent = (value: number) => `${PERCENT.format(value)}%`;

/* ------------------------------------------------------------------ Donut */

export type DonutSegment = { label: string; value: number; color: string };

export function DonutChart({ segments, centerLabel }: { segments: DonutSegment[]; centerLabel: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const visible = segments.filter((s) => s.value > 0);
  const gap = visible.length > 1 ? 1.2 : 0;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center xl:flex-col 2xl:flex-row">
      <div className="relative size-44 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={describeSegments(segments, total)}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="13" />
          {total > 0 &&
            visible.map((segment) => {
              const length = (segment.value / total) * circumference;
              const dash = Math.max(0, length - gap);
              const circle = (
                <circle
                  key={segment.label}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="13"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                >
                  <title>{`${segment.label}: ${formatNumber(segment.value)} (${formatPercent((segment.value / total) * 100)})`}</title>
                </circle>
              );
              offset += length;
              return circle;
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums text-ink">{formatNumber(total)}</span>
          <span className="text-xs text-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="grid w-full max-w-60 gap-3">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-start gap-2.5">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: segment.color }} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm text-muted">{segment.label}</span>
              <span className="text-xl font-bold tabular-nums text-ink">{formatNumber(segment.value)}</span>
              <span className="ml-2 text-sm tabular-nums text-muted">{formatPercent(total ? (segment.value / total) * 100 : 0)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function describeSegments(segments: DonutSegment[], total: number) {
  return `Komposisi: ${segments
    .map((s) => `${s.label} ${formatNumber(s.value)} (${formatPercent(total ? (s.value / total) * 100 : 0)})`)
    .join(", ")}.`;
}

/* ------------------------------------------------------------------ Bar */

export type BarDatum = { label: string; value: number; detail?: string };

export function BarChart({ data, unit, color = "var(--color-primary)" }: { data: BarDatum[]; unit: string; color?: string }) {
  const axis = niceAxis(Math.max(0, ...data.map((d) => d.value)));
  return (
    <figure className="grid grid-cols-[auto_1fr] grid-rows-[12rem_auto] gap-x-2">
      <YAxis ticks={axis.ticks} />
      <div className="relative border-b border-line">
        <GridLines count={axis.ticks.length - 1} />
        <ul className="relative flex h-full items-end justify-around gap-2 px-1">
          {data.map((datum) => {
            const height = axis.max ? (datum.value / axis.max) * 100 : 0;
            return (
              <li key={datum.label} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0}>
                <span className="sr-only">{`${datum.label}: ${formatNumber(datum.value)} ${unit}`}</span>
                <div className="relative flex w-full max-w-11 flex-col items-center justify-end" style={{ height: `${height}%` }}>
                  <span className="absolute bottom-full mb-1 text-sm font-bold tabular-nums text-ink" aria-hidden="true">
                    {formatNumber(datum.value)}
                  </span>
                  <span
                    className="block h-full w-full rounded-t-[4px] transition-opacity group-hover:opacity-85"
                    style={{ background: color, minHeight: datum.value > 0 ? 2 : 0 }}
                  />
                </div>
                <Tooltip className="bottom-1/2 left-1/2 -translate-x-1/2">
                  <strong className="block">{datum.label}</strong>
                  {formatNumber(datum.value)} {unit}
                  {datum.detail && <span className="block text-white/75">{datum.detail}</span>}
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </div>
      <span aria-hidden="true" />
      <div className="flex justify-around gap-2 px-1 pt-2" aria-hidden="true">
        {data.map((datum) => (
          <span key={datum.label} className="flex-1 truncate text-center text-xs text-muted">
            {datum.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ Area / line */

export type LineSeries = { key: string; label: string; color: string; values: number[] };

export function AreaChart({ labels, series, caption }: { labels: string[]; series: LineSeries[]; caption?: string[] }) {
  const n = labels.length;
  const axis = niceAxis(Math.max(0, ...series.flatMap((s) => s.values)));
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const y = (v: number) => 100 - (axis.max ? (v / axis.max) * 100 : 0);

  return (
    <figure className="@container">
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted" aria-label="Legenda">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-[auto_1fr] grid-rows-[11rem_auto] gap-x-2">
        <YAxis ticks={axis.ticks} />
        <div className="relative border-b border-line">
          <GridLines count={axis.ticks.length - 1} />
          <div className="absolute inset-0 mx-1.5">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
              {series.map((s) => {
                const line = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(v)}`).join(" ");
                return (
                  <g key={s.key}>
                    <path d={`${line} L${x(n - 1)} 100 L${x(0)} 100 Z`} fill={s.color} fillOpacity="0.1" />
                    <path
                      d={line}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}
            </svg>
            {series.map((s) =>
              s.values.map((v, i) => (
                <span
                  key={`${s.key}-${i}`}
                  aria-hidden="true"
                  className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                  style={{ left: `${x(i)}%`, top: `${y(v)}%`, background: s.color }}
                />
              )),
            )}
            {/* Area hover per bulan: garis bantu + tooltip nilai semua seri. */}
            <ul className="absolute inset-0">
              {labels.map((label, i) => (
                <li
                  key={label + i}
                  tabIndex={0}
                  className="group absolute inset-y-0 -translate-x-1/2 outline-none"
                  style={{ left: `${x(i)}%`, width: `${100 / Math.max(1, n - 1)}%` }}
                >
                  <span className="absolute inset-y-0 left-1/2 w-px bg-ink/25 opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100" />
                  <span className="sr-only">
                    {`${caption?.[i] ?? label}: ${series.map((s) => `${s.label} ${formatNumber(s.values[i] ?? 0)}`).join(", ")}`}
                  </span>
                  <Tooltip className={cn("top-0", i < n / 3 ? "left-1/2 translate-x-1" : i > (2 * n) / 3 ? "right-1/2 -translate-x-1" : "left-1/2 -translate-x-1/2")}>
                    <strong className="mb-1 block">{caption?.[i] ?? label}</strong>
                    {series.map((s) => (
                      <span key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                        {s.label}: <strong className="tabular-nums">{formatNumber(s.values[i] ?? 0)}</strong>
                      </span>
                    ))}
                  </Tooltip>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <span aria-hidden="true" />
        <div className="relative mx-1.5 h-6" aria-hidden="true">
          {labels.map((label, i) => (
            <span
              key={label + i}
              className={cn("absolute top-2 -translate-x-1/2 text-xs text-muted", n > 8 && (n - 1 - i) % 2 === 1 && "@max-sm:hidden")}
              style={{ left: `${x(i)}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ Shared */

function YAxis({ ticks }: { ticks: number[] }) {
  return (
    <div className="relative w-7 text-right text-xs tabular-nums text-muted" aria-hidden="true">
      {ticks.map((tick, i) => (
        <span key={tick} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(i / (ticks.length - 1)) * 100}%` }}>
          {formatNumber(tick)}
        </span>
      ))}
    </div>
  );
}

function GridLines({ count }: { count: number }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="absolute inset-x-0 h-px bg-line/70" style={{ top: `${(i / count) * 100}%` }} />
      ))}
    </div>
  );
}

function Tooltip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none invisible absolute z-10 w-max max-w-56 rounded-lg bg-ink px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-(--shadow-lift) transition-opacity duration-150",
        "group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100",
        className,
      )}
    >
      {children}
    </span>
  );
}
