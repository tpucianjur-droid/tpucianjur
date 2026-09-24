export const PUBLIC_NAV = [
  { href: "/", label: "Beranda" },
  { href: "/cari-makam", label: "Cari Makam" },
  { href: "/denah", label: "Denah" },
  { href: "/panduan", label: "Panduan" },
  { href: "/tentang", label: "Tentang" },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/cari-makam") return pathname.startsWith("/cari-makam") || pathname.startsWith("/makam/");
  return pathname.startsWith(href);
}
