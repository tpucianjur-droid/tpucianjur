"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Info, Map as MapIcon, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { isActivePath, PUBLIC_NAV } from "./nav-links";

const ICONS: Record<(typeof PUBLIC_NAV)[number]["href"], LucideIcon> = {
  "/": Home,
  "/cari-makam": Search,
  "/denah": MapIcon,
  "/panduan": BookOpen,
  "/tentang": Info,
};

/** Bottom navigation ala aplikasi native — hanya HP & tablet (< lg). Aman untuk safe-area iPhone/Android. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(21_54_45/0.06)] backdrop-blur supports-backdrop-filter:bg-white/85 lg:hidden"
    >
      <ul className="mx-auto grid h-(--app-nav-h) max-w-2xl grid-cols-5 px-1">
        {PUBLIC_NAV.map((item) => (
          <li key={item.href}>
            <BottomNavLink href={item.href} label={item.label} icon={ICONS[item.href]} active={isActivePath(pathname, item.href)} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function BottomNavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-full flex-col items-center justify-center gap-1 rounded-xl text-[0.72rem] font-semibold leading-none transition-colors",
        active ? "text-primary" : "text-muted hover:text-ink",
      )}
    >
      <span
        className={cn(
          "relative flex h-7 w-14 items-center justify-center rounded-full transition-colors duration-200",
          active ? "bg-sage" : "group-active:bg-surface",
        )}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 2} aria-hidden="true" />
        {badge ? (
          <span className="absolute -right-0.5 -top-1 min-w-5 rounded-full bg-danger px-1 py-0.5 text-center text-[0.65rem] font-bold leading-none text-white">
            {badge > 99 ? "99+" : badge}
            <span className="sr-only"> data perlu verifikasi</span>
          </span>
        ) : null}
        <PendingBar />
      </span>
      <span className="max-w-full truncate px-0.5">{label}</span>
    </Link>
  );
}

/** Indikator halus saat halaman tujuan masih dimuat (ukuran tetap, hanya opacity yang berubah). */
function PendingBar() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary transition-opacity duration-150",
        pending ? "animate-pulse opacity-100" : "opacity-0",
      )}
    />
  );
}
