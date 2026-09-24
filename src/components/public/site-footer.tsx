import { APP } from "@/lib/config";

/** Footer minimal: hanya copyright, rata tengah. Ruang bawah disisakan untuk bottom navigation (HP & tablet). */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line/60 pb-(--app-nav-space)">
      <p className="px-4 py-5 text-center text-sm text-muted">
        © {new Date().getFullYear()} {APP.shortName} {APP.subtitle}
      </p>
    </footer>
  );
}
