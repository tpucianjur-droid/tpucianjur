import type { ReactNode } from "react";
import { Archive, ArchiveRestore, Boxes, Check, CheckCircle2, ClipboardList, History, LandPlot, Pencil, Plus, Trash2 } from "lucide-react";
import { AreaChart, BarChart, DonutChart, formatPercent } from "@/components/admin/dashboard/charts";
import { KpiCard, MiniTable, Panel } from "@/components/admin/dashboard/dashboard-ui";
import { cn } from "@/components/ui/cn";
import { requireAdminPage } from "@/lib/auth";
import { APP } from "@/lib/config";
import { getDashboardData } from "@/lib/data/admin";
import { ACTIVITY_LABEL, percent, type ActivityKind } from "@/lib/dashboard/stats";
import { formatNumber } from "@/lib/format";

export const metadata = { title: "Dashboard" };

const COLOR = {
  needs: "var(--color-danger)",
  verified: "var(--color-chart-green)",
  inserted: "var(--color-chart-green)",
  verifiedLine: "var(--color-chart-gold)",
} as const;

const ACTIVITY_ICON: Record<ActivityKind, { icon: ReactNode; className: string }> = {
  create: { icon: <Plus className="size-3.5" />, className: "bg-chart-green text-white" },
  verify: { icon: <Check className="size-3.5" />, className: "bg-chart-green text-white" },
  update: { icon: <Pencil className="size-3" />, className: "bg-chart-gold text-white" },
  archive: { icon: <Archive className="size-3" />, className: "bg-muted text-white" },
  restore: { icon: <ArchiveRestore className="size-3" />, className: "bg-primary text-white" },
  delete: { icon: <Trash2 className="size-3" />, className: "bg-danger text-white" },
};

export default async function DashboardPage() {
  const [admin, data] = await Promise.all([requireAdminPage(), getDashboardData()]);
  const needsPct = percent(data.needsVerification, data.total);
  const verifiedPct = percent(data.verified, data.total);
  const ranking = [...data.blocks].sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
  const topBlock = ranking[0]?.total ? ranking[0].id : null;

  return (
    <div className="space-y-5">
      <header className="border-l-[3px] border-gold pl-3">
        <p className="text-muted">Selamat datang, {admin.displayName}</p>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Dashboard</h1>
        <p className="mt-0.5 text-[0.95rem] text-muted">Ringkasan data pemakaman {APP.shortName} {APP.subtitle}</p>
      </header>

      <section aria-label="Ringkasan utama" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          tone="primary"
          icon={<LandPlot className="size-6" />}
          label="Total Makam"
          value={data.total}
          note="data aktif, tanpa arsip"
          href="/admin/makam"
        />
        <KpiCard
          tone="danger"
          icon={<ClipboardList className="size-6" />}
          label="Perlu Verifikasi"
          value={data.needsVerification}
          highlight={formatPercent(needsPct)}
          note="dari total makam"
          href="/admin/makam?status=needs_verification"
        />
        <KpiCard
          tone="success"
          icon={<CheckCircle2 className="size-6" />}
          label="Sudah Terverifikasi"
          value={data.verified}
          highlight={formatPercent(verifiedPct)}
          note="dari total makam"
          href="/admin/makam?status=verified"
        />
        <KpiCard
          tone="gold"
          icon={<Boxes className="size-6" />}
          label="Total Blok Aktif"
          value={data.activeBlocks}
          note={`dari ${formatNumber(data.totalBlocks)} blok terdaftar`}
          href="/admin/denah"
        />
      </section>

      <section aria-label="Grafik data" className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Komposisi Status Makam" subtitle="Semua blok">
          <DonutChart
            centerLabel="Total Makam"
            segments={[
              { label: "Perlu Verifikasi", value: data.needsVerification, color: COLOR.needs },
              { label: "Sudah Terverifikasi", value: data.verified, color: COLOR.verified },
            ]}
          />
        </Panel>

        <Panel title="Distribusi Makam per Blok" subtitle="Jumlah data makam aktif">
          <BarChart
            unit="makam"
            data={data.blocks.map((block) => ({
              label: block.name,
              value: block.total,
              detail: `${formatNumber(block.needsVerification)} perlu verifikasi${block.is_active ? "" : " · nonaktif"}`,
            }))}
          />
        </Panel>

        <Panel title="Aktivitas Data per Bulan" subtitle="12 bulan terakhir" className="lg:col-span-2 xl:col-span-1">
          <AreaChart
            labels={data.monthly.map((m) => m.label)}
            caption={data.monthly.map((m) => `${m.label} ${m.year}`)}
            series={[
              { key: "inserted", label: "Data Dimasukkan", color: COLOR.inserted, values: data.monthly.map((m) => m.inserted) },
              { key: "verified", label: "Data Terverifikasi", color: COLOR.verifiedLine, values: data.monthly.map((m) => m.verified) },
            ]}
          />
        </Panel>
      </section>

      <section aria-label="Ringkasan data" className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Ringkasan Verifikasi" link={{ href: "/admin/makam?status=needs_verification", label: "Lihat detail" }}>
          <MiniTable head={["Status", "Jumlah", "Persentase"]} alignRight={[1, 2]}>
            <SummaryRow color={COLOR.needs} label="Perlu Verifikasi" value={data.needsVerification} pct={needsPct} />
            <SummaryRow color={COLOR.verified} label="Sudah Terverifikasi" value={data.verified} pct={verifiedPct} />
            <tr className="bg-sage/70 font-bold">
              <td className="rounded-l-lg px-3 py-3">Total Makam</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatNumber(data.total)}</td>
              <td className="rounded-r-lg px-3 py-3 text-right tabular-nums">{data.total ? "100%" : "0%"}</td>
            </tr>
          </MiniTable>
        </Panel>

        <Panel title="Blok dengan Data Terbanyak" link={{ href: "/admin/denah", label: "Lihat semua" }}>
          <MiniTable head={["Peringkat", "Blok", "Jumlah Makam"]} alignRight={[2]}>
            {ranking.map((block, i) => (
              <tr key={block.id} className={cn(block.id === topBlock && "bg-sage/60")}>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-full text-xs font-bold",
                      i === 0 && block.total > 0 ? "bg-gold text-white" : "bg-line text-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-medium">
                  {block.name}
                  {!block.is_active && <span className="ml-1.5 text-xs font-normal text-muted">(nonaktif)</span>}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatNumber(block.total)}</td>
              </tr>
            ))}
          </MiniTable>
          {ranking.length === 0 && <p className="py-6 text-center text-sm text-muted">Belum ada blok.</p>}
        </Panel>

        <Panel title="Aktivitas Terbaru" subtitle="Perubahan data makam" className="lg:col-span-2 xl:col-span-1">
          {data.activities.length === 0 ? (
            <p className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted">
              <History className="size-6" aria-hidden="true" />
              Belum ada aktivitas tercatat.
            </p>
          ) : (
            <MiniTable head={["Waktu", "Aktivitas", "Keterangan"]} wideOnly={[2]}>
              {data.activities.map((activity) => {
                const icon = ACTIVITY_ICON[activity.kind];
                return (
                  <tr key={activity.id}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs leading-tight text-muted">
                      <ActivityTime iso={activity.createdAt} />
                    </td>
                    <td className="w-full max-w-0 px-3 py-2.5 @md:w-auto @md:max-w-none">
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full", icon.className)} aria-hidden="true">
                          {icon.icon}
                        </span>
                        {ACTIVITY_LABEL[activity.kind]}
                      </span>
                      {/* Panel sempit: keterangan tampil sebagai baris kedua. */}
                      <span className="mt-0.5 block truncate pl-7 text-xs text-muted @md:hidden">
                        {describeGrave(activity.graveCode, activity.deceasedName)}
                      </span>
                    </td>
                    <td className="hidden w-full max-w-0 truncate px-3 py-2.5 @md:table-cell" title={describeGrave(activity.graveCode, activity.deceasedName)}>
                      {describeGrave(activity.graveCode, activity.deceasedName)}
                    </td>
                  </tr>
                );
              })}
            </MiniTable>
          )}
        </Panel>
      </section>
    </div>
  );
}

function SummaryRow({ color, label, value, pct }: { color: string; label: string; value: number; pct: number }) {
  return (
    <tr>
      <td className="px-3 py-3">
        <span className="flex items-center gap-2 @sm:whitespace-nowrap">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
          {label}
        </span>
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{formatNumber(value)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{formatPercent(pct)}</td>
    </tr>
  );
}

const ACTIVITY_DATE = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const ACTIVITY_TIME = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

function ActivityTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <>-</>;
  return (
    <time dateTime={iso}>
      <span className="block text-ink/80">{ACTIVITY_DATE.format(date)}</span>
      {ACTIVITY_TIME.format(date).replace(".", ":")} WIB
    </time>
  );
}

function describeGrave(code: string | null, name: string | null) {
  return [code, name].filter(Boolean).join(" - ") || "—";
}
