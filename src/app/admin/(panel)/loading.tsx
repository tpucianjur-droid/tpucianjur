import { DashboardSkeleton, LoadingRegion } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Memuat dashboard">
      <DashboardSkeleton />
    </LoadingRegion>
  );
}
