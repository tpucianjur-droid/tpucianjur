import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { getActiveBlocks, searchPublicGraves } from "@/lib/data/public";
import { buildSearchInput, isSearchable } from "@/lib/search/normalize";
import { SearchClient } from "./search-client";

export const metadata: Metadata = {
  title: "Cari Makam",
  description: "Cari makam di TPU Astana Pratiksha Cianjur berdasarkan nama yang dimakamkan.",
};

export default async function CariMakamPage({ searchParams }: PageProps<"/cari-makam">) {
  const params = await searchParams;
  const input = buildSearchInput(params.q, params.blok);
  const blocks = await getActiveBlocks();

  // Hasil awal dirender di server bila URL sudah berisi kata kunci (bisa dibagikan/di-bookmark).
  let initialResult = null;
  let initialError: string | null = null;
  if (isSearchable(input.term)) {
    try {
      initialResult = await searchPublicGraves(input);
    } catch {
      initialError = "Data belum dapat dimuat. Coba lagi.";
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Pencarian Makam"
        title="Cari Makam"
        accent="di TPU Astana Pratiksha Cianjur"
        description="Temukan lokasi makam dengan cepat, akurat, dan mudah melalui nama yang dimakamkan."
      />
      <div className="relative z-10 mx-auto -mt-8 max-w-5xl px-4 pb-16 sm:px-6">
        <SearchClient
          blocks={blocks.map((b) => ({ code: b.code, name: b.name }))}
          initialQuery={input.term}
          initialBlock={input.block}
          initialResult={initialResult}
          initialError={initialError}
        />
      </div>
    </>
  );
}
