"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { LandPlot, LayoutDashboard, LogOut, Map as MapIcon, Settings, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { BottomNavLink } from "@/components/public/bottom-nav";
import { cn } from "@/components/ui/cn";
import { Spinner } from "@/components/ui/spinner";
import { SubmitButton } from "@/components/ui/submit-button";
import { signOut } from "@/lib/actions/auth";
import { APP } from "@/lib/config";

type NavItem = { href: string; label: string; short: string; icon: LucideIcon; exact?: boolean; badge?: boolean };

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard, exact: true },
  // Verifikasi data ada di dalam Data Makam (tab "Perlu Verifikasi"); badge = jumlah data perlu verifikasi.
  { href: "/admin/makam", label: "Data Makam", short: "Data", icon: LandPlot, badge: true },
  { href: "/admin/denah", label: "Denah Blok", short: "Denah", icon: MapIcon },
  { href: "/admin/pengaturan", label: "Pengaturan", short: "Pengaturan", icon: Settings },
];

const isActive = (pathname: string, item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 rounded-lg">
      <span className="rounded-xl bg-white p-1">
        <LogoMark className="size-9" />
      </span>
      <span className="text-[0.95rem] font-bold leading-tight text-white">
        {APP.shortName}
        <span className="block text-xs font-medium tracking-[0.3em] text-white/70">{APP.subtitle.toUpperCase()}</span>
      </span>
    </Link>
  );
}

/** Sidebar Admin — desktop/laptop (≥ lg). */
export function AdminSidebar({ needsVerification }: { needsVerification: number }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col gap-8 bg-primary px-4 py-6 lg:flex">
      <div className="px-2">
        <Brand />
      </div>
      <nav aria-label="Menu Admin" className="flex flex-1 flex-col">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-12 items-center gap-3 rounded-xl px-4 text-base font-medium transition-colors duration-150",
                    active ? "bg-white/12 text-white" : "text-white/75 hover:bg-white/8 hover:text-white",
                  )}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-[#d4b476]" aria-hidden="true" />}
                  <item.icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 whitespace-nowrap">{item.label}</span>
                  <SidebarPending />
                  {item.badge && needsVerification > 0 && (
                    <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
                      {needsVerification}
                      <span className="sr-only"> data perlu verifikasi</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <form action={signOut} className="mt-6 border-t border-white/15 pt-4">
          <SubmitButton
            variant="ghost"
            className="min-h-12 w-full justify-start px-4 text-base font-medium text-white/75 hover:bg-white/8 hover:text-white"
            icon={<LogOut className="size-5" aria-hidden="true" />}
            loadingText="Keluar…"
          >
            Keluar
          </SubmitButton>
        </form>
      </nav>
      <p className="px-2 text-xs text-white/55">
        {APP.name}
        <br />v{APP.version}
      </p>
    </aside>
  );
}

/** Spinner kecil saat menu yang diklik masih memuat (ukuran tetap, hanya opacity berubah). */
function SidebarPending() {
  const { pending } = useLinkStatus();
  return <Spinner className={cn("size-4 text-white/80 transition-opacity", pending ? "opacity-100" : "opacity-0")} />;
}

/** Header Admin HP & tablet: logo + judul halaman + keluar. Menu ada di bottom navigation (tanpa hamburger). */
export function AdminMobileBar({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const current = NAV.find((item) => isActive(pathname, item));
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href="/admin" aria-label="Dashboard Admin" className="rounded-lg">
          <LogoMark className="size-9" />
        </Link>
        <span className="min-w-0 flex-1 truncate text-[1.0625rem] font-bold">{current?.label ?? "Admin"}</span>
        <span
          className="flex size-9 items-center justify-center rounded-full bg-sage text-sm font-bold uppercase text-primary"
          title={displayName}
          aria-hidden="true"
        >
          {displayName.slice(0, 1)}
        </span>
        <form action={signOut}>
          <SubmitButton
            variant="secondary"
            className="min-h-10 px-3 text-sm"
            icon={<LogOut className="size-4" aria-hidden="true" />}
            loadingText="Keluar…"
          >
            Keluar
          </SubmitButton>
        </form>
      </div>
    </header>
  );
}

/** Bottom navigation Admin — HP & tablet (< lg). */
export function AdminBottomNav({ needsVerification }: { needsVerification: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu Admin"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(21_54_45/0.06)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid h-(--app-nav-h) max-w-2xl grid-cols-4 px-1">
        {NAV.map((item) => (
          <li key={item.href}>
            <BottomNavLink
              href={item.href}
              label={item.short}
              icon={item.icon}
              active={isActive(pathname, item)}
              badge={item.badge ? needsVerification : undefined}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
