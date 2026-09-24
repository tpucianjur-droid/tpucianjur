import { AdminPageHeader } from "@/components/admin/admin-ui";
import { GraveForm } from "@/components/admin/grave-form";
import { Alert } from "@/components/ui/feedback";
import { getAdminBlocks, getBlockGravesForEditor } from "@/lib/data/admin";

export const metadata = { title: "Tambah Data Makam" };

export default async function AddGravePage() {
  const blocks = await getAdminBlocks();
  const defaultBlock = blocks.find((b) => b.is_active) ?? null;
  const blockGraves = defaultBlock ? await getBlockGravesForEditor(defaultBlock.id) : [];
  const suggestedNumber = blockGraves.reduce((max, g) => Math.max(max, g.grave_number ?? 0), 0) + 1;

  return (
    <>
      <AdminPageHeader
        title="Tambah Data Makam"
        description="Lengkapi informasi data makam dengan benar dan jelas."
        back={{ href: "/admin/makam", label: "Data Makam" }}
      />
      {blocks.length === 0 ? (
        <Alert tone="warning">Belum ada blok. Tambahkan blok terlebih dahulu di menu Denah Blok.</Alert>
      ) : (
        <div className="pb-28">
          <GraveForm
          grave={null}
          blocks={blocks}
          blockGraves={blockGraves}
          photoUrl={null}
          backHref="/admin/makam"
          suggestedNumber={suggestedNumber}
          />
        </div>
      )}
    </>
  );
}
