import { AdminHeaderSkeleton, FormSkeleton, LoadingRegion } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Memuat pengaturan">
      <AdminHeaderSkeleton />
      <FormSkeleton sections={1} />
    </LoadingRegion>
  );
}
