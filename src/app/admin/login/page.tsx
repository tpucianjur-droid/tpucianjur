import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HelpCircle, Home, LogOut } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { HeroCover } from "@/components/public/responsive-cover";
import { LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/feedback";
import { signOut } from "@/lib/actions/auth";
import { checkAdmin, type AdminCheck } from "@/lib/auth";
import { APP } from "@/lib/config";
import { getSupabaseEnv } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Login Admin", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/admin";
  const configured = getSupabaseEnv() !== null;

  let check: AdminCheck = { status: "signed-out" };
  if (configured) {
    try {
      check = await checkAdmin();
    } catch {
      check = { status: "signed-out" };
    }
  }
  if (check.status === "ok") redirect("/admin");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-white lg:block" aria-hidden="true">
        <div className="absolute inset-0">
          <HeroCover />
        </div>
        <div className="absolute inset-0 bg-linear-to-b from-white via-white/70 to-transparent" />
        <div className="relative space-y-6 p-12">
          <Logo />
          <div className="max-w-md space-y-4 pt-10">
            <p className="eyebrow">Sistem Aplikasi Pemakaman</p>
            <p className="font-serif text-5xl font-bold leading-tight text-ink">
              {APP.shortName} <span className="block text-gold">{APP.subtitle}</span>
            </p>
            <p className="text-lg text-muted">Pengelolaan data pemakaman yang rapi, aman, dan mudah.</p>
          </div>
        </div>
      </section>

      <main className="flex min-w-0 items-center justify-center bg-surface px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-8">
        <div className="w-full max-w-[26rem] animate-slide-up">
          <div className="rounded-3xl border border-line/70 bg-white p-6 shadow-(--shadow-lift) sm:p-8">
            <div className="mb-6 text-center">
              <LogoMark className="mx-auto mb-3 size-12" />
              <h1 className="font-serif text-[1.75rem] font-bold leading-tight">Login Admin</h1>
              <p className="mt-1.5 text-muted">Masuk untuk mengelola data pemakaman.</p>
            </div>

            {!configured && (
              <Alert tone="warning" title="Database belum terhubung" className="mb-5">
                Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY pada environment (lihat .env.example).
              </Alert>
            )}

            {check.status === "forbidden" || params.error === "forbidden" ? (
              <div className="space-y-4">
                <Alert tone="error" title="Akun tidak memiliki akses Admin" live>
                  {check.status === "forbidden" && check.email ? `Akun ${check.email} ` : "Akun ini "}
                  belum terdaftar sebagai Admin/Operator. Hubungi pengelola sistem.
                </Alert>
                <form action={signOut}>
                  <SubmitButton
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    icon={<LogOut className="size-5" aria-hidden="true" />}
                    loadingText="Keluar…"
                  >
                    Keluar dan gunakan akun lain
                  </SubmitButton>
                </form>
              </div>
            ) : (
              <LoginForm next={next} />
            )}

            <LinkButton
              href="/"
              variant="secondary"
              size="lg"
              className="mt-3 w-full"
              icon={<Home className="size-5" aria-hidden="true" />}
            >
              Kembali ke Beranda
            </LinkButton>

            <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted">
              <HelpCircle className="size-4" aria-hidden="true" />
              Lupa password? Hubungi administrator sistem.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
