import Link from "next/link";
import { ChevronRight, MapPin, Shield } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { Card, IconBadge } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth";
import { getAdminSettings } from "@/lib/data/admin";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const [admin, settings] = await Promise.all([requireAdminPage(), getAdminSettings()]);

  return (
    <>
      <AdminPageHeader title="Pengaturan" description="Lokasi TPU untuk Google Maps dan informasi umum." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <IconBadge>
              <MapPin className="size-5" />
            </IconBadge>
            <div>
              <h2 className="text-xl font-bold">Lokasi TPU (Google Maps)</h2>
              <p className="text-muted">Perubahan langsung dipakai oleh tombol “Petunjuk ke TPU” di halaman publik.</p>
            </div>
          </div>
          <SettingsForm settings={settings} />
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-2 text-lg font-bold">Denah & Blok</h2>
            <p className="mb-3 text-muted">Atur Blok A–D, kapasitas, grid, dan posisi makam.</p>
            <Link href="/admin/denah" className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary hover:underline">
              Buka Denah Blok <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <Shield className="size-5 text-primary" aria-hidden="true" />
              Akun
            </h2>
            <p className="font-semibold">{admin.displayName}</p>
            <p className="text-muted">{admin.email}</p>
            <p className="mt-3 text-sm text-muted">
              Akun Admin baru dan reset password dikelola pengelola sistem melalui Supabase Dashboard (lihat README).
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
