/** Tautan Google Maps eksternal menuju satu titik TPU (tanpa API key, tanpa embed berat). */
export type MapsSettings = {
  google_maps_url: string | null;
  google_maps_query: string | null;
  address: string | null;
};

/** URL untuk membuka lokasi TPU. Prioritas: URL khusus dari Admin > query > alamat. */
export function buildMapsUrl(settings: MapsSettings | null): string | null {
  if (!settings) return null;
  const custom = settings.google_maps_url?.trim();
  if (custom && isSafeHttpUrl(custom)) return custom;
  const query = (settings.google_maps_query || settings.address || "").trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** URL petunjuk arah (rute) menuju TPU. */
export function buildDirectionsUrl(settings: MapsSettings | null): string | null {
  if (!settings) return null;
  const query = (settings.google_maps_query || settings.address || "").trim();
  if (query) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  return buildMapsUrl(settings);
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const PLUS_CODE = /(?:^|[\s,])([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3})(?=$|[\s,])/i;

/** Ambil Google Plus Code (mis. "548F+PCC") dari teks lokasi/alamat, bila ada. */
export function findPlusCode(value: string | null | undefined): string | null {
  const match = value?.match(PLUS_CODE);
  return match ? match[1].toUpperCase() : null;
}
