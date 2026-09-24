/**
 * Tipe database sesuai supabase/migrations (baseline V1 + 20260924000002).
 * Setelah project Supabase online tersedia, file ini dapat diregenerasi dengan:
 *   npx supabase gen types typescript --project-id <PROJECT_REF> --schema public > src/lib/supabase/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type CemeteryRow = Timestamps & {
  id: string;
  name: string;
  address: string | null;
  google_maps_url: string | null;
  google_maps_query: string | null;
};

export type BlockRow = Timestamps & {
  id: string;
  cemetery_id: string;
  code: string;
  name: string;
  capacity: number | null;
  grid_rows: number | null;
  grid_columns: number | null;
  sort_order: number;
  is_active: boolean;
};

export type GraveRow = Timestamps & {
  id: string;
  cemetery_id: string;
  block_id: string | null;
  legacy_no: number | null;
  grave_number: number | null;
  grave_code: string;
  deceased_name: string;
  death_date: string | null;
  recorded_date_raw: string | null;
  date_semantics: string;
  heir_name: string | null;
  heir_phone: string | null;
  heir_address: string | null;
  visual_x: number | null;
  visual_y: number | null;
  visual_row: number | null;
  visual_column: number | null;
  photo_path: string | null;
  verify_deceased_name: boolean;
  verify_death_date: boolean;
  verify_heir_name: boolean;
  verify_heir_phone: boolean;
  verify_heir_address: boolean;
  verify_location: boolean;
  verification_status: string;
  is_public: boolean;
  transcription_confidence: string | null;
  transcription_notes: string | null;
  source_file: string | null;
  archived_at: string | null;
};

export type AuditLogRow = {
  id: number;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  before_data: Json | null;
  after_data: Json | null;
  created_at: string;
};

export type AdminUserRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

export type PublicGraveRow = {
  id: string;
  grave_code: string;
  deceased_name: string;
  death_date: string | null;
  block_code: string | null;
  block_name: string | null;
  grave_number: number | null;
  visual_x: number | null;
  visual_y: number | null;
  visual_row: number | null;
  visual_column: number | null;
  photo_path: string | null;
};

export type SearchResultRow = {
  id: string;
  grave_code: string;
  deceased_name: string;
  death_date: string | null;
  block_code: string | null;
  grave_number: number | null;
  total_count: number;
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  public: {
    Tables: {
      cemeteries: {
        Row: CemeteryRow;
        Insert: Optional<CemeteryRow, "id" | "address" | "google_maps_url" | "google_maps_query" | "created_at" | "updated_at">;
        Update: Partial<CemeteryRow>;
        Relationships: [];
      };
      blocks: {
        Row: BlockRow;
        Insert: Optional<
          BlockRow,
          "id" | "capacity" | "grid_rows" | "grid_columns" | "sort_order" | "is_active" | "created_at" | "updated_at"
        >;
        Update: Partial<BlockRow>;
        Relationships: [
          { foreignKeyName: "blocks_cemetery_id_fkey"; columns: ["cemetery_id"]; isOneToOne: false; referencedRelation: "cemeteries"; referencedColumns: ["id"] },
        ];
      };
      graves: {
        Row: GraveRow;
        Insert: Partial<GraveRow> & Pick<GraveRow, "cemetery_id" | "grave_code" | "deceased_name">;
        Update: Partial<GraveRow>;
        Relationships: [
          { foreignKeyName: "graves_block_id_fkey"; columns: ["block_id"]; isOneToOne: false; referencedRelation: "blocks"; referencedColumns: ["id"] },
          { foreignKeyName: "graves_cemetery_id_fkey"; columns: ["cemetery_id"]; isOneToOne: false; referencedRelation: "cemeteries"; referencedColumns: ["id"] },
        ];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Partial<AuditLogRow> & Pick<AuditLogRow, "entity_type" | "action">;
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
      admin_users: {
        Row: AdminUserRow;
        Insert: Optional<AdminUserRow, "email" | "display_name" | "created_at">;
        Update: Partial<AdminUserRow>;
        Relationships: [];
      };
    };
    Views: {
      public_graves: { Row: PublicGraveRow; Relationships: [] };
      block_grave_counts: {
        Row: { block_id: string; code: string; total: number; needs_verification: number };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      format_grave_code: { Args: { p_block_code: string; p_number: number }; Returns: string };
      search_public_graves: {
        Args: { p_query: string; p_block?: string | null; p_code?: string | null; p_limit?: number; p_offset?: number };
        Returns: SearchResultRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
