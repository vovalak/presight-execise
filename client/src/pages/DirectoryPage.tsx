import { useCallback, useState } from 'react';
import { ActiveFilters } from '../components/ActiveFilters';
import { FacetSidebar } from '../components/FacetSidebar';
import { Header } from '../components/Header';
import { MobileDrawer } from '../components/MobileDrawer';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { SkeletonCards } from '../components/states/SkeletonCards';
import { UserList } from '../components/UserList';
import { useFacetsQuery } from '../hooks/useFacetsQuery';
import { useUsersQuery } from '../hooks/useUsersQuery';
import {
  activeFilterCount,
  hasActiveFilters,
  toggleValue,
  viewStateKey,
  type Order,
  type SortField,
} from '../state/searchParams';
import { useViewState } from '../state/useViewState';

export function DirectoryPage() {
  const { state, update, clearFilters } = useViewState();
  const users = useUsersQuery(state);
  const facets = useFacetsQuery(state);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const toggleHobby = (value: string) => update({ hobbies: toggleValue(state.hobbies, value) });
  const toggleNationality = (value: string) =>
    update({ nationalities: toggleValue(state.nationalities, value) });
  const setSort = (sort: SortField) => update({ sort });
  const setOrder = (order: Order) => update({ order });
  const setSearch = (q: string) => update({ q }, { replace: true });

  const sidebar = (
    <FacetSidebar
      state={state}
      facets={facets}
      onToggleHobby={toggleHobby}
      onToggleNationality={toggleNationality}
      onClearFilters={clearFilters}
    />
  );

  const { query } = users;
  const isUpdating =
    query.isPlaceholderData || (query.isFetching && !query.isFetchingNextPage && !query.isPending);

  let content;
  if (query.isPending) {
    content = <SkeletonCards />;
  } else if (query.isError && !query.data) {
    content = <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  } else if (users.items.length === 0) {
    content = <EmptyState hasFilters={hasActiveFilters(state)} onClearFilters={clearFilters} />;
  } else {
    content = <UserList users={users} stateKey={viewStateKey(state)} />;
  }

  return (
    <div className="flex h-dvh flex-col">
      <Header
        state={state}
        filterCount={activeFilterCount(state)}
        onSearch={setSearch}
        onSortChange={setSort}
        onOrderChange={setOrder}
        onOpenFilters={() => setDrawerOpen(true)}
      />
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white md:block">
          {sidebar}
        </aside>
        <main className="flex min-h-0 flex-1 flex-col">
          <ActiveFilters
            state={state}
            total={users.total}
            isUpdating={isUpdating}
            onRemoveHobby={toggleHobby}
            onRemoveNationality={toggleNationality}
            onClearSearch={() => setSearch('')}
            onClearAll={clearFilters}
          />
          {content}
        </main>
      </div>
      <MobileDrawer open={drawerOpen} title="Filters" onClose={closeDrawer}>
        {sidebar}
      </MobileDrawer>
    </div>
  );
}
