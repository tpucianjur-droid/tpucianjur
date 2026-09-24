import { Skeleton } from "@/components/ui/feedback";
import { LoadingRegion, PageHeroSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Memuat data makam">
      <PageHeroSkeleton />
      <div className="relative z-10 mx-auto -mt-8 max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 rounded-2xl border border-line/70 bg-white p-6 shadow-(--shadow-card) md:grid-cols-[320px_1fr]">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}
