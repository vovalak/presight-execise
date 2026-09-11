import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FacetList } from './FacetList';

const facets = [
  { value: 'Chess', count: 12 },
  { value: 'Poetry', count: 7 },
];

function renderList(props: Partial<ComponentProps<typeof FacetList>> = {}) {
  return render(
    <FacetList
      title="Hobbies"
      hint="match all"
      facets={facets}
      selected={[]}
      isLoading={false}
      isUpdating={false}
      error={null}
      onToggle={() => {}}
      onRetry={() => {}}
      {...props}
    />,
  );
}

describe('FacetList', () => {
  it('lists values with counts and reports toggles', () => {
    const onToggle = vi.fn();
    renderList({ onToggle });
    expect(screen.getByRole('checkbox', { name: /Chess/ })).not.toBeChecked();
    expect(screen.getByText('12')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Chess/ }));
    expect(onToggle).toHaveBeenCalledWith('Chess');
  });

  it('collapses and expands from the section header', () => {
    renderList({ selected: ['Poetry'] });
    const toggle = screen.getByRole('button', { name: /Hobbies/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('checkbox', { name: /Chess/ })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('checkbox', { name: /Chess/ })).not.toBeInTheDocument();
    expect(toggle).toHaveAccessibleName(/1 selected/);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('checkbox', { name: /Chess/ })).toBeInTheDocument();
    expect(toggle).not.toHaveAccessibleName(/selected/);
  });
});
