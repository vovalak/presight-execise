import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { User } from '../api/types';
import { UserCard } from './UserCard';

const base: User = {
  id: 1,
  avatar: 'https://example.test/avatar.svg',
  first_name: 'Ada',
  last_name: 'Lovelace',
  date_of_birth: '1990-03-01',
  age: 36,
  nationality: 'British',
  hobbies: [],
};

describe('UserCard', () => {
  it('shows name, nationality, and age', () => {
    render(<UserCard user={{ ...base, hobbies: ['Chess'] }} />);
    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByText('British')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('Chess')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more hobbies/ })).not.toBeInTheDocument();
  });

  it('shows at most two hobbies and a +n badge for the rest', () => {
    render(
      <UserCard user={{ ...base, hobbies: ['Math', 'Poetry', 'Chess', 'Reading', 'Music'] }} />,
    );
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Poetry')).toBeInTheDocument();
    expect(screen.queryByText('Chess')).not.toBeInTheDocument();
    const badge = screen.getByRole('button', { name: '3 more hobbies: Chess, Reading, Music' });
    expect(badge).toHaveTextContent('+3');
  });

  it('lists the hidden hobbies in a tooltip on focus and closes on blur or Escape', () => {
    render(
      <UserCard user={{ ...base, hobbies: ['Math', 'Poetry', 'Chess', 'Reading', 'Music'] }} />,
    );
    const badge = screen.getByRole('button', { name: /more hobbies/ });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.focus(badge);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Chess, Reading, Music');
    expect(tooltip).not.toHaveTextContent('Math');

    fireEvent.blur(badge);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.mouseEnter(badge);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows no badge for exactly two hobbies', () => {
    render(<UserCard user={{ ...base, hobbies: ['Math', 'Poetry'] }} />);
    expect(screen.queryByRole('button', { name: /more hobbies/ })).not.toBeInTheDocument();
  });

  it('explains when a person has no hobbies', () => {
    render(<UserCard user={base} />);
    expect(screen.getByText('No hobbies listed')).toBeInTheDocument();
  });
});
