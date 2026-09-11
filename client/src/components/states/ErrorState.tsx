import { AlertIcon } from '../Icons';

interface Props {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertIcon className="size-6" />
      </span>
      <h2 className="font-semibold text-slate-900">Something went wrong</h2>
      <p className="text-sm text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
