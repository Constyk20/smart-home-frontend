import { Skeleton, SkeletonCard } from "../ui/Skeleton";

/** Placeholder with the same three-area shape as the real dashboard, shown until the first load finishes. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your house" className="grid gap-4 md:grid-cols-2 lg:grid-cols-[17.5rem_minmax(0,1fr)_19rem] xl:grid-cols-[19.5rem_minmax(0,1fr)_21rem]">
      <div className="order-2 space-y-4 lg:order-1">
        <SkeletonCard rows={5} />
        <SkeletonCard rows={2} />
      </div>
      <div className="order-1 space-y-3 md:col-span-2 lg:order-2 lg:col-span-1">
        <Skeleton className="h-[22rem] w-full rounded-xl sm:h-[28rem] md:h-[32rem] lg:h-[calc(100vh-18rem)] lg:min-h-[32rem]" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
      <div className="order-3 space-y-4">
        <SkeletonCard rows={2} className="min-h-56" />
        <SkeletonCard rows={4} />
      </div>
    </div>
  );
}

/** Generic placeholder for the other sections while the first load finishes. */
export function SectionSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <SkeletonCard rows={3} />
      <SkeletonCard rows={3} />
      <SkeletonCard rows={3} />
    </div>
  );
}
