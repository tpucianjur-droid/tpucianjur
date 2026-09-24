import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { logError } from "@/lib/log";
import { getServerSupabase } from "@/lib/supabase/server";

const COLUMNS = [
  "legacy_no",
  "grave_code",
  "block_code",
  "grave_number",
  "deceased_name",
  "death_date",
  "recorded_date_raw",
  "date_semantics",
  "heir_name",
  "heir_phone",
  "heir_address",
  "visual_row",
  "visual_column",
  "visual_x",
  "visual_y",
  "photo_path",
  "verify_deceased_name",
  "verify_death_date",
  "verify_heir_name",
  "verify_heir_phone",
  "verify_heir_address",
  "verify_location",
  "verification_status",
  "is_public",
  "archived_at",
  "transcription_confidence",
  "transcription_notes",
  "source_file",
  "created_at",
  "updated_at",
] as const;

/** Backup/export CSV seluruh data makam (NFR-009). Hanya Admin. */
export async function GET() {
  const check = await checkAdmin().catch(() => null);
  if (check?.status !== "ok") {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }

  const supabase = await getServerSupabase();
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("graves")
      .select("*, blocks(code)")
      .order("grave_code")
      .range(from, from + pageSize - 1);
    if (error) {
      logError("export", error);
      return NextResponse.json({ error: "Export gagal. Coba lagi." }, { status: 500 });
    }
    for (const row of data ?? []) {
      const { blocks, ...rest } = row as Record<string, unknown> & { blocks: { code: string } | null };
      rows.push({ ...rest, block_code: blocks?.code ?? null });
    }
    if (!data || data.length < pageSize) break;
  }

  const csv = toCsv(
    COLUMNS,
    rows.map((row) => COLUMNS.map((column) => row[column])),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="data-makam-tpu-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
