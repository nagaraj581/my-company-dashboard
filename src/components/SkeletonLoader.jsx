/**
 * SkeletonLoader Component
 * 
 * Provides shimmer-effect skeleton loaders for better UX during data loading.
 * Can be used as a replacement for "Loading..." text to make load times feel faster.
 * 
 * Usage:
 * {loadingData ? <SkeletonLoader rows={5} /> : <YourContent />}
 */

export function SkeletonLoader({ rows = 3, variant = "table" }) {
  if (variant === "text") {
    return (
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse h-6 bg-gray-200 rounded w-3/4" />
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  // Default: table skeleton
  return (
    <div className="animate-pulse">
      {/* Table header skeleton */}
      <div className="bg-gray-100 rounded-t-lg p-3 flex gap-3 mb-2">
        <div className="h-4 bg-gray-200 rounded flex-1" />
        <div className="h-4 bg-gray-200 rounded flex-1" />
        <div className="h-4 bg-gray-200 rounded flex-1" />
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>

      {/* Table body skeleton rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b p-3 flex gap-3">
          <div className="h-4 bg-gray-200 rounded flex-1" />
          <div className="h-4 bg-gray-200 rounded flex-1" />
          <div className="h-4 bg-gray-200 rounded flex-1" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonInvoiceList({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white border rounded p-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 rounded w-16" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
