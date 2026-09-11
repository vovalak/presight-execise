import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import { useColumnCount } from '../hooks/useColumnCount';
import type { UsersQuery } from '../hooks/useUsersQuery';
import { LoadingRow } from './states/LoadingRow';
import { UserCard } from './UserCard';

interface Props {
  users: UsersQuery;
  stateKey: string;
}

const PREFETCH_ROWS = 6;
const ESTIMATED_ROW_HEIGHT = 124;
export const TWO_COLUMN_MIN_WIDTH = 600;

export function UserList({ users, stateKey }: Props) {
  const { query, items } = users;
  const parentRef = useRef<HTMLDivElement>(null);
  const columns = useColumnCount(parentRef, TWO_COLUMN_MIN_WIDTH);
  const hasLoaderRow = query.hasNextPage;
  const cardRows = Math.ceil(items.length / columns);
  const rowCount = cardRows + (hasLoaderRow ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => items[index * columns]?.id ?? 'loader',
    // Measuring inside React's commit would otherwise call flushSync mid-lifecycle (React 19 warns).
    useFlushSync: false,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const lastVisibleIndex = virtualRows.at(-1)?.index ?? -1;

  useEffect(() => {
    const nearEnd = lastVisibleIndex >= cardRows - 1 - PREFETCH_ROWS;
    if (
      nearEnd &&
      query.hasNextPage &&
      !query.isFetchingNextPage &&
      !query.isPlaceholderData &&
      !query.isFetchNextPageError
    ) {
      void query.fetchNextPage();
    }
  }, [lastVisibleIndex, cardRows, query]);

  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 });
  }, [stateKey]);

  return (
    <div
      ref={parentRef}
      className={`min-h-0 flex-1 overflow-y-auto transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}
      aria-busy={query.isPlaceholderData}
    >
      <div
        role="list"
        aria-label="People"
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualRows.map((row) => {
          const rowUsers = items.slice(row.index * columns, (row.index + 1) * columns);
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              role={rowUsers.length === 0 ? undefined : 'presentation'}
              className={`absolute top-0 left-0 grid w-full gap-4 px-4 py-1.5 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
              style={{ transform: `translateY(${row.start}px)` }}
            >
              {rowUsers.length > 0 ? (
                rowUsers.map((user) => (
                  <div key={user.id} role="listitem" className="grid min-w-0">
                    <UserCard user={user} />
                  </div>
                ))
              ) : (
                <div className="col-span-full">
                  <LoadingRow
                    error={query.isFetchNextPageError}
                    onRetry={() => void query.fetchNextPage()}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
