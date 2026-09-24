"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { CheckboxField, TextField } from "@/components/ui/field";
import { saveBlock } from "@/lib/actions/settings";
import { IDLE, type ActionResult } from "@/lib/actions/result";
import type { AdminBlock } from "@/lib/data/admin";

/** Konfigurasi blok: kapasitas & grid TIDAK di-hard-code — boleh dikosongkan bila belum diketahui. */
export function BlockForm({ block }: { block: AdminBlock | null }) {
  const toast = useToast();
  const [state, action, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = await saveBlock(prev, formData);
    if (result.status === "success") toast(result.message);
    if (result.status === "error") toast(result.message, "error");
    return result;
  }, IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const prefix = block ? `blk-${block.code}` : "blk-new";

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={block?.id ?? ""} />
      {state.status !== "idle" && (
        <Alert tone={state.status === "success" ? "success" : "error"} live>
          {state.message}
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`${prefix}-code`}
          label="Kode blok"
          name="code"
          defaultValue={block?.code ?? ""}
          required
          maxLength={3}
          error={errors.code}
          hint="1–3 huruf, mis. A"
          autoCapitalize="characters"
        />
        <TextField id={`${prefix}-name`} label="Nama blok" name="name" defaultValue={block?.name ?? ""} required maxLength={60} error={errors.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          id={`${prefix}-capacity`}
          label="Kapasitas"
          name="capacity"
          type="number"
          inputMode="numeric"
          min={1}
          defaultValue={block?.capacity ?? ""}
          error={errors.capacity}
          hint="Kosongkan bila belum diketahui"
        />
        <TextField
          id={`${prefix}-rows`}
          label="Jumlah baris"
          name="grid_rows"
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          defaultValue={block?.grid_rows ?? ""}
          error={errors.grid_rows}
        />
        <TextField
          id={`${prefix}-cols`}
          label="Jumlah kolom"
          name="grid_columns"
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          defaultValue={block?.grid_columns ?? ""}
          error={errors.grid_columns}
          hint="Dipakai untuk posisi otomatis"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <TextField
          id={`${prefix}-order`}
          label="Urutan"
          name="sort_order"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={block?.sort_order ?? 0}
          error={errors.sort_order}
        />
        <div className="flex items-end">
          <CheckboxField
            id={`${prefix}-active`}
            name="is_active"
            label="Blok aktif"
            description="Blok nonaktif tidak tampil di halaman publik."
            defaultChecked={block?.is_active ?? true}
          />
        </div>
      </div>
      <Button type="submit" size="lg" loading={pending} loadingText="Menyimpan…" icon={<Save className="size-5" aria-hidden="true" />}>
        {block ? `Simpan ${block.name}` : "Tambah Blok"}
      </Button>
    </form>
  );
}
