export function SkeletonCard({ className = "" }) {
  return (
    <div
      className={[
        "overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5",
        className,
      ].join(" ")}
    >
      <div className="animate-pulse space-y-4">
        <div className="h-3 w-24 rounded-full bg-white/10" />
        <div className="h-8 w-32 rounded-full bg-white/10" />
        <div className="h-3 w-full rounded-full bg-white/10" />
        <div className="h-3 w-3/4 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
