import { Skeleton } from "@/components/ui/feedback";
import { AdminHeaderSkeleton, DenahSkeleton, LoadingRegion } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Memuat denah">
      <AdminHeaderSkeleton />
      <div className="mb-6 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mb-6 h-56 w-full rounded-2xl" />
      <DenahSkeleton className="h-[60vh] min-h-96" />
    </LoadingRegion>
  );
}
