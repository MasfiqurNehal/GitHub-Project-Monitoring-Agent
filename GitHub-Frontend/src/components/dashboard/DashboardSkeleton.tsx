import { Skeleton } from '../ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Banner Skeleton */}
      <Skeleton className="h-24 w-full rounded-2xl" />

      {/* Filter Bar Skeleton */}
      <Skeleton className="h-20 w-full rounded-2xl" />

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>

      {/* Tables Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  );
}
