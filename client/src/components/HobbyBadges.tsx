import { Tooltip } from './Tooltip';

export const VISIBLE_HOBBIES = 2;

interface Props {
  hobbies: string[];
}

export function HobbyBadges({ hobbies }: Props) {
  if (hobbies.length === 0) {
    return <p className="text-xs text-slate-400 italic">No hobbies listed</p>;
  }
  const visible = hobbies.slice(0, VISIBLE_HOBBIES);
  const hidden = hobbies.slice(VISIBLE_HOBBIES);
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Hobbies">
      {visible.map((hobby) => (
        <li
          key={hobby}
          className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent"
        >
          {hobby}
        </li>
      ))}
      {hidden.length > 0 && (
        <li className="shrink-0">
          <Tooltip content={hidden.join(', ')}>
            {(trigger) => (
              <button
                type="button"
                {...trigger}
                aria-label={`${hidden.length} more hobbies: ${hidden.join(', ')}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                +{hidden.length}
              </button>
            )}
          </Tooltip>
        </li>
      )}
    </ul>
  );
}
