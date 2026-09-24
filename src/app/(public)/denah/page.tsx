import type { Metadata } from "next";
import { Map as MapIcon, MapPinOff } from "lucide-react";
import { BlockTabs, DenahCodeForm, DenahNavProvider, DenahStage } from "@/components/denah/block-tabs";
import { PublicDenah } from "@/components/denah/public-denah";
import { PageHero } from "@/components/public/page-hero";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Card, IconBadge } from "@/components/ui/card";
import { getActiveBlocks, getDenahGraves } from "@/lib/data/public";
import { parseGraveCode } from "@/lib/graves/code";
import { normalizeBlockFilter } from "@/lib/search/normalize";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Denah Makam",
  description: "Denah internal Blok A–D TPU Astana Pratiksha Cianjur.",
};

export default async function DenahPage({ searchParams }: PageProps<"/denah">) {
  const params = await searchParams;
  const code = typeof params.kode === "string" ? parseGraveCode(params.kode) : null;
  const blocks = await getActiveBlocks();

  const requestedBlock = normalizeBlockFilter(params.blok) ?? code?.split("-")[0] ?? null;
  const block = blocks.find((b) => b.code === requestedBlock) ?? blocks[0] ?? null;
  const graves = block ? await getDenahGraves(block.code) : [];
  const target = code ? (graves.find((g) => g.grave_code === code) ?? null) : null;

  return (
    <>
      <PageHero
        eyebrow="Denah Internal"
        title="Denah Makam"
        description="Pilih blok untuk melihat susunan makam. Ketik kode makam untuk menandai posisinya."
        crumbs={[{ label: "Denah" }]}
      />
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl space-y-4 px-4 pb-16 sm:px-6">
        <DenahNavProvider>
          <Card className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <BlockTabs blocks={blocks} activeCode={block?.code ?? null} />
              <DenahCodeForm defaultValue={code ?? ""} />
            </div>

            {code && !target && (
              <Alert tone="warning" live>
                Kode <strong>{code}</strong> tidak ditemukan pada {block?.name ?? "denah"}. Periksa kembali kode makam, atau{" "}
                <a href={`/cari-makam?q=${encodeURIComponent(code)}`} className="font-semibold text-primary underline">
                  cari melalui halaman pencarian
                </a>
                .
              </Alert>
            )}

            {block ? (
              <>
                <div className="flex items-center gap-3">
                  <IconBadge>
                    <MapIcon className="size-5" />
                  </IconBadge>
                  <h2 className="font-serif text-xl font-semibold">Denah {block.name}</h2>
                </div>
                {graves.length > 0 ? (
                  <DenahStage>
                    <PublicDenah key={block.code} block={block} graves={graves} target={target} />
                  </DenahStage>
                ) : (
                  <EmptyState icon={<MapPinOff className="size-6" />} title={`Denah ${block.name} belum tersedia`}>
                    Belum ada data makam yang dipetakan pada blok ini.
                  </EmptyState>
                )}
              </>
            ) : (
              <EmptyState icon={<MapPinOff className="size-6" />} title="Denah belum tersedia">
                Data blok belum dapat dimuat. Coba lagi beberapa saat lagi.
              </EmptyState>
            )}
          </Card>
        </DenahNavProvider>
      </div>
    </>
  );
}
