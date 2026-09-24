/** Transisi halaman Admin: fade-in ringan saat berpindah menu. */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
