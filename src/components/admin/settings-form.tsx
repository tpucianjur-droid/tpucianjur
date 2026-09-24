"use client";

import { useActionState, useState } from "react";
import { ExternalLink, Save } from "lucide-react";
import { Button, ExternalLinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { FieldMessage, inputClass, Label, TextField } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { saveSettings } from "@/lib/actions/settings";
import { IDLE, type ActionResult } from "@/lib/actions/result";
import { TPU_ADDRESS } from "@/lib/config";
import { buildDirectionsUrl } from "@/lib/maps";
import type { CemeteryRow } from "@/lib/supabase/database.types";

export const DEFAULT_TPU_LOCATION = TPU_ADDRESS;

export function SettingsForm({ settings }: { settings: CemeteryRow | null }) {
  const toast = useToast();
  const [state, action, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = await saveSettings(prev, formData);
    if (result.status === "success") toast("Data berhasil disimpan.");
    if (result.status === "error") toast(result.message, "error");
    return result;
  }, IDLE);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const [query, setQuery] = useState(settings?.google_maps_query ?? DEFAULT_TPU_LOCATION);
  const [url, setUrl] = useState(settings?.google_maps_url ?? "");
  const [address, setAddress] = useState(settings?.address ?? DEFAULT_TPU_LOCATION);
  const previewUrl = buildDirectionsUrl({ google_maps_query: query, google_maps_url: url, address });

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="id" value={settings?.id ?? ""} />
      {state.status !== "idle" && (
        <Alert tone={state.status === "success" ? "success" : "error"} live>
          {state.message}
        </Alert>
      )}

      <TextField label="Nama TPU" name="name" defaultValue={settings?.name ?? "TPU Astana Pratiksha Cianjur"} required error={errors.name} />

      <div>
        <Label htmlFor="f-address">Alamat (tampil di halaman publik)</Label>
        <textarea
          id="f-address"
          name="address"
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={cn(inputClass(Boolean(errors.address)), "py-3")}
        />
        <FieldMessage id="f-address-msg" error={errors.address} />
      </div>

      <div>
        <Label htmlFor="f-google_maps_query">Lokasi untuk Google Maps</Label>
        <input
          id="f-google_maps_query"
          name="google_maps_query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-describedby="f-google_maps_query-msg"
          className={inputClass(Boolean(errors.google_maps_query))}
        />
        <FieldMessage
          id="f-google_maps_query-msg"
          error={errors.google_maps_query}
          hint="Alamat, Plus Code (mis. 548F+PCC), atau koordinat. Dipakai untuk tombol “Petunjuk ke TPU”."
        />
      </div>

      <div>
        <Label htmlFor="f-google_maps_url">Link Google Maps khusus (opsional)</Label>
        <input
          id="f-google_maps_url"
          name="google_maps_url"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
          aria-describedby="f-google_maps_url-msg"
          className={inputClass(Boolean(errors.google_maps_url))}
        />
        <FieldMessage
          id="f-google_maps_url-msg"
          error={errors.google_maps_url}
          hint="Bila diisi, tombol “Buka Google Maps” memakai link ini. Kosongkan untuk memakai lokasi di atas."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" loading={pending} loadingText="Menyimpan…" icon={<Save className="size-5" aria-hidden="true" />}>
          Simpan Pengaturan
        </Button>
        {previewUrl && (
          <ExternalLinkButton href={previewUrl} variant="secondary" size="lg" icon={<ExternalLink className="size-5" aria-hidden="true" />}>
            Uji di Google Maps
          </ExternalLinkButton>
        )}
      </div>
    </form>
  );
}
