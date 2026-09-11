import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchUsersPage } from '../api/client';
import type { User } from '../api/types';
import { viewStateKey, type ViewState } from '../state/searchParams';

export function useUsersQuery(state: ViewState) {
  const query = useInfiniteQuery({
    queryKey: ['users', viewStateKey(state)],
    queryFn: ({ pageParam, signal }) => fetchUsersPage(state, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasMore ? lastPage.pageInfo.nextCursor : null,
    placeholderData: keepPreviousData,
  });

  const items = useMemo<User[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.pageInfo.total;

  return { query, items, total };
}

export type UsersQuery = ReturnType<typeof useUsersQuery>;
