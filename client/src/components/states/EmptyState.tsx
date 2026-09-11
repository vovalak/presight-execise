import { UsersIcon } from '../Icons';

interface Props {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function EmptyState({ hasFilters, onClearFilters }: Props) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
        <UsersIcon className="size-6" />
      </span>
      {hasFilters ? (
        <>
          <h2 className="font-semibold text-slate-900">No people match these filters</h2>
          <p className="text-sm text-slate-600">
            Try a different name, or remove some hobbies or nationalities.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Clear filters
          </button>
        </>
      ) : (
        <>
          <h2 className="font-semibold text-slate-900">The directory is empty</h2>
          <p className="text-sm text-slate-600">
            Seed the database with <code className="rounded bg-slate-200 px-1">yarn seed</code> and
            reload.
          </p>
        </>
      )}
    </div>
  );
}
