import { DenahSkeleton, LoadingRegion, PageHeroSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Memuat posisi makam">
      <PageHeroSkeleton />
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-line/70 bg-white p-4 shadow-(--shadow-card) sm:p-5">
          <DenahSkeleton />
        </div>
      </div>
    </LoadingRegion>
  );
}
