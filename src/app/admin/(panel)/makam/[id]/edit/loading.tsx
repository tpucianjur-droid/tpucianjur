import { AdminHeaderSkeleton, FormSkeleton, LoadingRegion } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Memuat data makam">
      <AdminHeaderSkeleton withAction />
      <FormSkeleton />
    </LoadingRegion>
  );
}
