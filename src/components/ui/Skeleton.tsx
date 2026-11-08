type BlockProps = { className?: string };

/** A grey shimmering placeholder. Hidden from screen readers; the parent announces loading. */
export function Skeleton({ className = "" }: BlockProps) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** Lines of text placeholder, last one shorter. */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={`h-3 ${index === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** A list row: round icon plus two lines. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** A card-shaped placeholder with a title bar and `rows` list rows. */
export function SkeletonCard({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={`rounded-xl border border-line bg-card p-4 shadow-sm ${className}`}>
      <Skeleton className="mb-4 h-4 w-1/3" />
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, index) => (
          <SkeletonRow key={index} />
        ))}
      </div>
    </div>
  );
}
