import type { Metadata } from "next";
import { AdminClock } from "@/components/admin/admin-clock";
import { AdminBottomNav, AdminMobileBar, AdminSidebar } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/lib/auth";
import { countNeedsVerification } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin TPU Astana Pratiksha" },
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdminPage();
  const needsVerification = await countNeedsVerification().catch(() => 0);

  return (
    <div className="flex min-h-dvh bg-surface">
      <AdminSidebar needsVerification={needsVerification} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileBar displayName={admin.displayName} />
        <div className="mx-auto hidden w-full max-w-[100rem] items-center justify-end gap-5 px-6 pt-5 lg:flex 2xl:px-8">
          <AdminClock />
          <span className="h-9 w-px bg-line" aria-hidden="true" />
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary font-bold uppercase text-white" aria-hidden="true">
              {admin.displayName.slice(0, 1)}
            </span>
            <span className="text-sm leading-tight">
              <span className="block font-semibold">{admin.displayName}</span>
              <span className="text-muted">{admin.email}</span>
            </span>
          </div>
        </div>
        <main className="mx-auto w-full max-w-[100rem] flex-1 px-4 pb-[calc(var(--app-nav-space)+1.5rem)] pt-5 sm:px-6 lg:pb-10 2xl:px-8">
          {children}
        </main>
      </div>
      <AdminBottomNav needsVerification={needsVerification} />
    </div>
  );
}
