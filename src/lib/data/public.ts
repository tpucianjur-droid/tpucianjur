import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SEARCH } from "@/lib/config";
import type { SearchInput } from "@/lib/search/normalize";
import { getPublicSupabase } from "@/lib/supabase/public";
import type { BlockRow, CemeteryRow, PublicGraveRow, SearchResultRow } from "@/lib/supabase/database.types";
import { logError } from "@/lib/log";

export type PublicSettings = Pick<CemeteryRow, "id" | "name" | "address" | "google_maps_url" | "google_maps_query">;
export type PublicBlock = Pick<BlockRow, "id" | "code" | "name" | "grid_rows" | "grid_columns" | "sort_order">;
/** Detail makam publik. Dari ahli waris hanya nama (view publik tidak memuat telepon/alamat). */
export type PublicGraveDetail = PublicGraveRow;
export type DenahGrave = Pick<
  PublicGraveRow,
  "id" | "grave_code" | "deceased_name" | "grave_number" | "visual_x" | "visual_y" | "visual_row" | "visual_column"
>;

/** Error yang dilempar ke error boundary: pesan sederhana, detail di log. */
export class DataUnavailableError extends Error {
  constructor(context: string, cause: unknown) {
    super("Data belum dapat dimuat.");
    logError(context, cause);
  }
}

// Konfigurasi jarang berubah -> di-cache & di-invalidate saat Admin menyimpan (updateTag).
const cachedSettings = unstable_cache(
  async (): Promise<PublicSettings | null> => {
    const { data, error } = await getPublicSupabase()
      .from("cemeteries")
      .select("id, name, address, google_maps_url, google_maps_query")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  ["public-settings"],
  { tags: [CACHE_TAGS.settings], revalidate: 3600 },
);

const cachedBlocks = unstable_cache(
  async (): Promise<PublicBlock[]> => {
    const { data, error } = await getPublicSupabase()
      .from("blocks")
      .select("id, code, name, grid_rows, grid_columns, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  ["public-blocks"],
  { tags: [CACHE_TAGS.blocks], revalidate: 3600 },
);

/** Pengaturan TPU; null bila belum dapat dimuat (UI menampilkan tombol Maps nonaktif). */
export async function getSettings(): Promise<PublicSettings | null> {
  try {
    return await cachedSettings();
  } catch (error) {
    logError("getSettings", error);
    return null;
  }
}

export async function getActiveBlocks(): Promise<PublicBlock[]> {
  try {
    return await cachedBlocks();
  } catch (error) {
    logError("getActiveBlocks", error);
    return [];
  }
}

export async function getPublicGraveByCode(code: string): Promise<PublicGraveDetail | null> {
  const { data, error } = await getPublicSupabase()
    .from("public_graves")
    .select(
      "id, grave_code, deceased_name, death_date, block_code, block_name, grave_number, visual_x, visual_y, visual_row, visual_column, photo_path, heir_name",
    )
    .eq("grave_code", code)
    .maybeSingle();
  if (error) throw new DataUnavailableError("getPublicGraveByCode", error);
  return data;
}

export async function getDenahGraves(blockCode: string): Promise<DenahGrave[]> {
  const { data, error } = await getPublicSupabase()
    .from("public_graves")
    .select("id, grave_code, deceased_name, grave_number, visual_x, visual_y, visual_row, visual_column")
    .eq("block_code", blockCode)
    .order("grave_number", { ascending: true })
    .limit(5000);
  if (error) throw new DataUnavailableError("getDenahGraves", error);
  return data ?? [];
}

export type SearchPage = { items: Omit<SearchResultRow, "total_count">[]; total: number };

export async function searchPublicGraves(input: SearchInput, offset = 0): Promise<SearchPage> {
  const { data, error } = await getPublicSupabase().rpc("search_public_graves", {
    p_query: input.term,
    p_block: input.block,
    p_code: input.code,
    p_limit: SEARCH.publicPageSize,
    p_offset: offset,
  });
  if (error) throw new DataUnavailableError("searchPublicGraves", error);
  const rows = data ?? [];
  return {
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    items: rows.map((row) => ({
      id: row.id,
      grave_code: row.grave_code,
      deceased_name: row.deceased_name,
      death_date: row.death_date,
      block_code: row.block_code,
      grave_number: row.grave_number,
      heir_name: row.heir_name,
    })),
  };
}
