"use client";

interface LoadingSkeletonProps {
  /** Width class for the title bar (default: "w-48") */
  titleWidth?: string;
  /** Number of content blocks to show (default: 1) */
  blocks?: number;
  /** Height class for each content block (default: "h-32") */
  blockHeight?: string;
}

export function LoadingSkeleton({
  titleWidth = "w-48",
  blocks = 1,
  blockHeight = "h-32",
}: LoadingSkeletonProps = {}) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className={`h-8 bg-gray-200 rounded ${titleWidth}`} />
        {Array.from({ length: blocks }, (_, i) => (
          <div key={i} className={`${blockHeight} bg-gray-200 rounded`} />
        ))}
      </div>
    </div>
  );
}
