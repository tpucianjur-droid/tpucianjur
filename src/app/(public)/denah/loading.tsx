import { Skeleton } from "@/components/ui/feedback";
import { DenahSkeleton, LoadingRegion, PageHeroSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Memuat denah">
      <PageHeroSkeleton />
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 pb-16 sm:px-6">
        <div className="space-y-4 rounded-2xl border border-line/70 bg-white p-4 shadow-(--shadow-card) sm:p-5">
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-7 w-48" />
          <DenahSkeleton />
        </div>
      </div>
    </LoadingRegion>
  );
}
