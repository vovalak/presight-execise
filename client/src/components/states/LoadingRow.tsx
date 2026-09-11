import { AlertIcon, Spinner } from '../Icons';

interface Props {
  error: boolean;
  onRetry: () => void;
}

export function LoadingRow({ error, onRetry }: Props) {
  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertIcon className="size-4" />
        Couldn't load more people.
        <button type="button" onClick={onRetry} className="font-medium underline">
          Retry
        </button>
      </div>
    );
  }
  return (
    <div
      className="flex items-center justify-center gap-2 p-4 text-sm text-slate-500"
      role="status"
    >
      <Spinner className="size-4" />
      Loading more…
    </div>
  );
}
