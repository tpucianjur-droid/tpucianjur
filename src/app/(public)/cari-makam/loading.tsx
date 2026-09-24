import { Skeleton } from "@/components/ui/feedback";
import { LoadingRegion, PageHeroSkeleton, ResultListSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Mencari makam">
      <PageHeroSkeleton />
      <div className="relative z-10 mx-auto -mt-8 max-w-5xl space-y-8 px-4 pb-16 sm:px-6">
        <div className="space-y-3 rounded-2xl border border-line/70 bg-white p-5 shadow-(--shadow-card) sm:p-6">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-13 w-full rounded-xl" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <ResultListSkeleton />
      </div>
    </LoadingRegion>
  );
}
