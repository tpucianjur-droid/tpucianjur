import { Skeleton } from "@/components/ui/feedback";
import { LoadingRegion } from "@/components/ui/skeletons";

/** Kerangka mengikuti layout Detail: Foto di kiri, card informasi bertumpuk di kanan (HP: satu tumpukan). */
export default function Loading() {
  return (
    <LoadingRegion label="Memuat detail data makam" className="max-w-6xl">
      <div className="mb-5 flex flex-col items-start gap-3 sm:mb-6 sm:flex-row-reverse sm:justify-between" aria-hidden="true">
        <Skeleton className="h-10 w-40 rounded-xl sm:h-11 sm:w-44" />
        <div className="space-y-2.5">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4.5 w-80 max-w-full" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] lg:gap-5" aria-hidden="true">
        <div className="space-y-3 rounded-2xl border border-line/70 bg-white p-4 sm:p-5 lg:p-6">
          <SectionTitleSkeleton />
          <Skeleton className="aspect-[16/10] w-full rounded-xl sm:aspect-[2/1] md:aspect-[3/4]" />
        </div>
        <div className="flex flex-col gap-4">
          {[2, 3, 4, 3].map((rows, i) => (
            <div key={i} className="space-y-4 rounded-2xl border border-line/70 bg-white p-4 sm:p-5 lg:p-6">
              <SectionTitleSkeleton />
              {Array.from({ length: rows }, (_, j) => (
                <div key={j} className="flex gap-3 sm:gap-4">
                  <Skeleton className="h-4 w-24 sm:w-36" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

function SectionTitleSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-9 rounded-full sm:size-10" />
      <Skeleton className="h-5 w-36" />
    </div>
  );
}
