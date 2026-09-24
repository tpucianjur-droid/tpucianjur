"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { isActivePath, PUBLIC_NAV } from "./nav-links";

/**
 * Header publik. Desktop/laptop (≥ lg): navbar horizontal.
 * HP & tablet: cukup logo + akses Login Admin — menu utama ada di bottom navigation (tanpa hamburger).
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur supports-backdrop-filter:bg-white/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-18">
        <Logo priority />

        <nav aria-label="Menu utama" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {PUBLIC_NAV.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex min-h-11 items-center rounded-lg px-3 text-[0.95rem] font-medium transition-colors",
                      active ? "text-primary" : "text-muted hover:text-primary",
                    )}
                  >
                    {item.label}
                    {active && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Link href="/admin/login" className={buttonClass("primary", "md", "max-lg:hidden")}>
          <LogIn className="size-4" aria-hidden="true" />
          Login Admin
        </Link>
        <Link
          href="/admin/login"
          title="Login Admin"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft lg:hidden"
        >
          <LogIn className="size-4" aria-hidden="true" />
          Admin
          <span className="sr-only"> — Login Admin</span>
        </Link>
      </div>
    </header>
  );
}
