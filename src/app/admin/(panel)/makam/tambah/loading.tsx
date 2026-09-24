import { AdminHeaderSkeleton, FormSkeleton, LoadingRegion } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Memuat formulir">
      <AdminHeaderSkeleton />
      <FormSkeleton />
    </LoadingRegion>
  );
}
