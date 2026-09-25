import "server-only";
import { ADMIN } from "@/lib/config";
import { LIST_STATUS_OPTIONS, type ListStatus } from "@/lib/admin/list-filters";
import { buildMonthlySeries, classifyActivity, rangeStartIso, type ActivityKind, type ActivitySource } from "@/lib/dashboard/stats";
import { logError } from "@/lib/log";
import { isVerifyFieldKey, VERIFY_FIELDS, type VerifyFieldKey } from "@/lib/graves/verification";
import { sanitizeForPostgrestFilter } from "@/lib/search/normalize";
import { getServerSupabase } from "@/lib/supabase/server";
import type { AuditLogRow, BlockRow, CemeteryRow, GraveRow } from "@/lib/supabase/database.types";
import { DataUnavailableError } from "@/lib/data/public";

export type AdminBlock = BlockRow;
export type AdminGrave = GraveRow & { blocks: { code: string; name: string } | null };

export const GRAVE_LIST_COLUMNS =
  "id, grave_code, deceased_name, death_date, heir_name, verification_status, is_public, archived_at, updated_at, block_id, grave_number, verify_deceased_name, verify_death_date, verify_heir_name, verify_heir_phone, verify_heir_address, verify_location" as const;

export type GraveListItem = Pick<
  GraveRow,
  | "id"
  | "grave_code"
  | "deceased_name"
  | "death_date"
  | "heir_name"
  | "verification_status"
  | "is_public"
  | "archived_at"
  | "updated_at"
  | "block_id"
  | "grave_number"
  | VerifyFieldKey
>;

export type GraveListFilters = {
  q: string;
  block: string | null;
  status: ListStatus;
  field: VerifyFieldKey | null;
  page: number;
};

/** Ringkasan filter aktif untuk kop export, mis. ["Blok: Blok A", "Status: Terverifikasi"]. Kosong = tanpa filter. */
export function describeListFilters(filters: GraveListFilters, blocks: Pick<BlockRow, "id" | "name">[]): string[] {
  const parts: string[] = [];
  if (filters.block) parts.push(`Blok: ${blocks.find((b) => b.id === filters.block)?.name ?? "-"}`);
  if (filters.status !== "all") parts.push(`Status: ${LIST_STATUS_OPTIONS.find((o) => o.value === filters.status)?.label}`);
  if (filters.field) parts.push(`Field perlu dicek: ${VERIFY_FIELDS.find((f) => f.key === filters.field)?.label}`);
  if (filters.q) parts.push(`Kata kunci: "${filters.q}"`);
  return parts;
}

export function parseListFilters(params: Record<string, string | string[] | undefined>): GraveListFilters {
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  const status = get("status");
  const field = get("field");
  const page = Number.parseInt(get("page"), 10);
  const needs = status === "needs_verification" || status === "needs";
  return {
    q: get("q").trim().slice(0, 100),
    block: /^[0-9a-f-]{36}$/i.test(get("blok")) ? get("blok") : null,
    // "needs" = nilai lama (sebelum menu Verifikasi Data digabung ke Data Makam); tetap diterima agar link lama jalan.
    status: needs ? "needs_verification" : status === "verified" || status === "archived" ? status : "all",
    // Filter "field yang perlu dicek" hanya berlaku di status Perlu Verifikasi.
    field: needs && isVerifyFieldKey(field) ? field : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Metode filter PostgREST yang dipakai applyListFilters (builder Supabase memenuhi bentuk ini). */
type FilterChain = {
  not(column: string, operator: string, value: unknown): FilterChain;
  is(column: string, value: null): FilterChain;
  eq(column: string, value: unknown): FilterChain;
  or(filters: string): FilterChain;
};

/** Filter daftar Data Makam — dipakai daftar (per halaman) dan export PDF (semua halaman) agar hasilnya sama. */
function applyListFilters<Q>(query: Q, filters: GraveListFilters): Q {
  let q = query as unknown as FilterChain;
  q = filters.status === "archived" ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  if (filters.status === "needs_verification") q = q.eq("verification_status", "NEEDS_VERIFICATION");
  if (filters.status === "verified") q = q.eq("verification_status", "VERIFIED");
  if (filters.field) q = q.eq(filters.field, true);
  if (filters.block) q = q.eq("block_id", filters.block);

  const term = sanitizeForPostgrestFilter(filters.q);
  if (term.length > 0) {
    q = q.or(`deceased_name.ilike.*${term}*,grave_code.ilike.*${term}*,heir_name.ilike.*${term}*`);
  }
  return q as unknown as Q;
}

export async function listGraves(filters: GraveListFilters) {
  const supabase = await getServerSupabase();
  const from = (filters.page - 1) * ADMIN.pageSize;
  const query = applyListFilters(
    supabase.from("graves").select(GRAVE_LIST_COLUMNS, { count: "exact" }),
    filters,
  )
    .order("grave_code", { ascending: true })
    .range(from, from + ADMIN.pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new DataUnavailableError("listGraves", error);
  return { items: (data ?? []) as GraveListItem[], total: count ?? 0 };
}

/** Kolom export PDF: TANPA telepon & alamat ahli waris. */
export type GraveExportRow = Pick<
  GraveRow,
  "grave_code" | "deceased_name" | "heir_name" | "death_date" | "grave_number" | "verification_status" | "archived_at"
> & { blocks: { code: string } | null };

/** Semua baris sesuai filter aktif (tanpa paginasi), diambil bertahap 1000 baris agar aman untuk ribuan data. */
export async function listGravesForExport(filters: GraveListFilters): Promise<GraveExportRow[]> {
  const supabase = await getServerSupabase();
  const rows: GraveExportRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await applyListFilters(
      supabase
        .from("graves")
        .select("grave_code, deceased_name, heir_name, death_date, grave_number, verification_status, archived_at, blocks(code)"),
      filters,
    )
      .order("grave_code", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new DataUnavailableError("listGravesForExport", error);
    rows.push(...((data ?? []) as unknown as GraveExportRow[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function getGraveForEdit(id: string): Promise<AdminGrave | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from("graves").select("*, blocks(code, name)").eq("id", id).maybeSingle();
  if (error) throw new DataUnavailableError("getGraveForEdit", error);
  return data as AdminGrave | null;
}

export async function getAdminBlocks(): Promise<AdminBlock[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("blocks")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });
  if (error) throw new DataUnavailableError("getAdminBlocks", error);
  return data ?? [];
}

export async function getAdminSettings(): Promise<CemeteryRow | null> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("cemeteries")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new DataUnavailableError("getAdminSettings", error);
  return data;
}

export type DashboardActivity = {
  id: number;
  createdAt: string;
  kind: ActivityKind;
  graveCode: string | null;
  deceasedName: string | null;
};

/**
 * Data Dashboard Admin: KPI, distribusi per blok, aktivitas per bulan (12 bulan, WIB), dan aktivitas terbaru.
 * Hanya membaca (SELECT). Grafik bulanan & aktivitas diambil dari created_at dan audit_logs;
 * bila audit log tidak dapat dibaca, Dashboard tetap tampil (bagian itu kosong).
 */
export async function getDashboardData(now = new Date()) {
  const supabase = await getServerSupabase();
  const since = rangeStartIso(now);
  const [total, needs, blocks, counts, inserted, verified, recent] = await Promise.all([
    supabase.from("graves").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase
      .from("graves")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .eq("verification_status", "NEEDS_VERIFICATION"),
    supabase.from("blocks").select("id, code, name, is_active, capacity").order("sort_order").order("code"),
    supabase.from("block_grave_counts").select("block_id, total, needs_verification"),
    supabase.from("graves").select("created_at").gte("created_at", since).limit(20000),
    supabase
      .from("audit_logs")
      .select("created_at")
      .eq("entity_type", "graves")
      .eq("action", "UPDATE")
      .eq("after_data->>verification_status", "VERIFIED")
      .or("before_data->>verification_status.is.null,before_data->>verification_status.neq.VERIFIED")
      .gte("created_at", since)
      .limit(20000),
    supabase
      .from("audit_logs")
      .select(
        "id, action, created_at, before_status:before_data->>verification_status, after_status:after_data->>verification_status, before_archived:before_data->>archived_at, after_archived:after_data->>archived_at, after_code:after_data->>grave_code, after_name:after_data->>deceased_name, before_code:before_data->>grave_code, before_name:before_data->>deceased_name",
      )
      .eq("entity_type", "graves")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const failed = [total, needs, blocks, counts].find((r) => r.error);
  if (failed?.error) throw new DataUnavailableError("getDashboardData", failed.error);
  for (const [context, result] of [
    ["dashboard:inserted", inserted],
    ["dashboard:verified", verified],
    ["dashboard:recent", recent],
  ] as const) {
    if (result.error) logError(context, result.error);
  }

  const countByBlock = new Map((counts.data ?? []).map((c) => [c.block_id, c]));
  const blockList = (blocks.data ?? []).map((b) => ({
    ...b,
    total: Number(countByBlock.get(b.id)?.total ?? 0),
    needsVerification: Number(countByBlock.get(b.id)?.needs_verification ?? 0),
  }));

  const totalCount = total.count ?? 0;
  const needsCount = needs.count ?? 0;

  const activities: DashboardActivity[] = ((recent.data ?? []) as unknown as RecentAuditRow[]).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    kind: classifyActivity(row),
    graveCode: row.after_code ?? row.before_code,
    deceasedName: row.after_name ?? row.before_name,
  }));

  return {
    total: totalCount,
    needsVerification: needsCount,
    verified: Math.max(0, totalCount - needsCount),
    activeBlocks: blockList.filter((b) => b.is_active).length,
    totalBlocks: blockList.length,
    blocks: blockList,
    monthly: buildMonthlySeries(
      now,
      (inserted.data ?? []).map((row) => row.created_at),
      ((verified.data ?? []) as { created_at: string }[]).map((row) => row.created_at),
    ),
    activities,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

type RecentAuditRow = ActivitySource & {
  id: number;
  created_at: string;
  after_code: string | null;
  after_name: string | null;
  before_code: string | null;
  before_name: string | null;
};

export async function countNeedsVerification(): Promise<number> {
  const supabase = await getServerSupabase();
  const { count } = await supabase
    .from("graves")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("verification_status", "NEEDS_VERIFICATION");
  return count ?? 0;
}

/** Data makam per blok untuk editor denah (tanpa data ahli waris). */
export async function getBlockGravesForEditor(blockId: string) {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("graves")
    .select("id, grave_code, deceased_name, grave_number, visual_x, visual_y, visual_row, visual_column, verify_location")
    .eq("block_id", blockId)
    .is("archived_at", null)
    .order("grave_number", { ascending: true })
    .limit(5000);
  if (error) throw new DataUnavailableError("getBlockGravesForEditor", error);
  return data ?? [];
}

export type AuditEntry = Pick<AuditLogRow, "id" | "action" | "created_at" | "actor_user_id"> & {
  actorName: string;
  changedFields: string[];
};

const AUDIT_IGNORED_FIELDS = new Set(["updated_at", "created_at", "verification_status"]);

export async function getGraveAudit(graveId: string, limit = 8): Promise<AuditEntry[]> {
  const supabase = await getServerSupabase();
  const [{ data: logs }, { data: admins }] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id, action, created_at, actor_user_id, before_data, after_data")
      .eq("entity_type", "graves")
      .eq("entity_id", graveId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("admin_users").select("user_id, display_name, email"),
  ]);
  const names = new Map((admins ?? []).map((a) => [a.user_id, a.display_name || a.email || "Admin"]));

  return (logs ?? []).map((log) => {
    const before = (log.before_data ?? {}) as Record<string, unknown>;
    const after = (log.after_data ?? {}) as Record<string, unknown>;
    const changedFields =
      log.action === "UPDATE"
        ? Object.keys(after).filter(
            (key) => !AUDIT_IGNORED_FIELDS.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]),
          )
        : [];
    return {
      id: log.id,
      action: log.action,
      created_at: log.created_at,
      actor_user_id: log.actor_user_id,
      actorName: log.actor_user_id ? (names.get(log.actor_user_id) ?? "Admin") : "Sistem (import data)",
      changedFields,
    };
  });
}
