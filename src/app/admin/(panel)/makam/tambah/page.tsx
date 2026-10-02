import { AdminPageHeader } from "@/components/admin/admin-ui";
import { GraveForm } from "@/components/admin/grave-form";
import { Alert } from "@/components/ui/feedback";
import { getAdminBlocks, getBlockGravesForEditor } from "@/lib/data/admin";
import { getBlockLayout } from "@/lib/denah/block-layouts";

export const metadata = { title: "Tambah Data Makam" };

export default async function AddGravePage() {
  const blocks = await getAdminBlocks();
  const defaultBlock = blocks.find((b) => b.is_active) ?? null;
  const graveEntries = await Promise.all(
    blocks.map(async (block) => [block.id, await getBlockGravesForEditor(block.id)] as const),
  );
  const blockGravesByBlock = Object.fromEntries(graveEntries);
  const blockGraves = defaultBlock ? blockGravesByBlock[defaultBlock.id] : [];
  const lastFilled = defaultBlock ? (getBlockLayout(defaultBlock.code)?.filledThrough ?? 0) : 0;
  const suggestedNumber = Math.max(lastFilled, ...blockGraves.map((grave) => grave.grave_number ?? 0)) + 1;

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
            blockGravesByBlock={blockGravesByBlock}
            photoUrl={null}
            backHref="/admin/makam"
            suggestedNumber={suggestedNumber}
          />
        </div>
      )}
    </>
  );
}
