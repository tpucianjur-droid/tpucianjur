import { Skeleton } from "@/components/ui/feedback";
import { AdminHeaderSkeleton, LoadingRegion, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Memuat data makam">
      <AdminHeaderSkeleton withAction />
      <Skeleton className="mb-6 h-24 w-full rounded-2xl" />
      <TableSkeleton />
    </LoadingRegion>
  );
}
