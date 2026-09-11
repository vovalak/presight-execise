interface Props {
  count?: number;
}

export function SkeletonCards({ count = 6 }: Props) {
  return (
    <div className="@container" aria-label="Loading people" aria-busy="true">
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-4 py-1.5 @min-[600px]:grid-cols-2">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="flex animate-pulse gap-4 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="size-14 shrink-0 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="flex justify-between">
                <div className="h-3.5 w-1/4 rounded bg-slate-200" />
                <div className="h-3.5 w-10 rounded bg-slate-200" />
              </div>
              <div className="flex gap-2 pt-1">
                <div className="h-5 w-16 rounded-full bg-slate-200" />
                <div className="h-5 w-20 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
