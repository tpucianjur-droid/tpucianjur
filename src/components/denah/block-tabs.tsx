"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { LoadingOverlay } from "@/components/ui/skeletons";
import { Spinner } from "@/components/ui/spinner";

type DenahNav = { pending: boolean; target: string | null; navigate: (href: string) => void };

const DenahNavContext = createContext<DenahNav>({ pending: false, target: null, navigate: () => {} });

/**
 * Navigasi denah (ganti blok / tandai kode) sebagai transisi: denah lama tetap tampil dengan overlay
 * "Memuat denah…" sampai data blok baru siap — tidak ada layar kosong.
 */
export function DenahNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const navigate = (href: string) => {
    setTarget(href);
    startTransition(() => router.push(href, { scroll: false }));
  };
  return <DenahNavContext.Provider value={{ pending, target: pending ? target : null, navigate }}>{children}</DenahNavContext.Provider>;
}

/** Wadah area denah: tampilkan overlay pemuatan saat berpindah blok. */
export function DenahStage({ children }: { children: ReactNode }) {
  const { pending } = useContext(DenahNavContext);
  return (
    <div className="relative" aria-busy={pending}>
      {children}
      {pending && <LoadingOverlay label="Memuat denah…" className="rounded-2xl" />}
    </div>
  );
}

export function BlockTabs({ blocks, activeCode }: { blocks: { code: string; name: string }[]; activeCode: string | null }) {
  const { navigate, target } = useContext(DenahNavContext);
  return (
    <nav aria-label="Pilih blok">
      <ul className="flex flex-wrap gap-2">
        {blocks.map((block) => {
          const href = `/denah?blok=${block.code}`;
          const active = block.code === activeCode;
          const loading = target === href;
          return (
            <li key={block.code}>
              <Link
                href={href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                  event.preventDefault();
                  if (!active) navigate(href);
                }}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-[0.95rem] font-medium transition-colors duration-150",
                  active || loading ? "border-primary bg-primary text-white" : "border-line bg-white text-ink hover:border-primary/40",
                )}
              >
                {loading && <Spinner className="size-4" />}
                {block.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Form "Tandai kode makam" pada denah. */
export function DenahCodeForm({ defaultValue }: { defaultValue: string }) {
  const { navigate, pending, target } = useContext(DenahNavContext);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("kode") ?? "").trim();
    navigate(code ? `/denah?kode=${encodeURIComponent(code)}` : "/denah");
  };
  return (
    <form action="/denah" onSubmit={onSubmit} className="flex gap-2">
      <label htmlFor="denah-kode" className="sr-only">
        Kode makam
      </label>
      <input
        id="denah-kode"
        name="kode"
        defaultValue={defaultValue}
        placeholder="Kode, mis. A-032"
        maxLength={12}
        className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-4 focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/15 lg:w-48"
      />
      <Button
        type="submit"
        loading={pending && Boolean(target?.includes("kode="))}
        loadingText="Mencari…"
        icon={<Search className="size-4" aria-hidden="true" />}
      >
        Tandai
      </Button>
    </form>
  );
}
