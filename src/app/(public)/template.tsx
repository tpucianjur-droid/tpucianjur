/** Transisi halaman sangat ringan: konten baru fade-in (opacity 0 → 1, 200 ms) setiap pindah halaman. */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
