/** Ringkasan makam untuk daftar hasil pencarian publik (ahli waris: nama saja, tanpa telepon/alamat). */
export type GraveSummary = {
  id: string;
  grave_code: string;
  deceased_name: string;
  death_date: string | null;
  block_code: string | null;
  grave_number: number | null;
  heir_name: string | null;
};
