import { Skeleton } from "@/components/ui/feedback";
import { AdminHeaderSkeleton, LoadingRegion } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Memuat detail data makam" className="max-w-6xl">
      <AdminHeaderSkeleton />
      <div className="mb-4 flex items-center gap-4 rounded-2xl border border-line/70 bg-white p-5 sm:p-6" aria-hidden="true">
        <Skeleton className="size-14 rounded-full sm:size-16" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-4 rounded-2xl border border-line/70 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
            {[0, 1, 2].map((j) => (
              <div key={j} className="flex gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
