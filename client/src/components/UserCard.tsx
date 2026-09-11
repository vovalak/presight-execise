import { memo } from 'react';
import type { User } from '../api/types';
import { Avatar } from './Avatar';
import { HobbyBadges } from './HobbyBadges';

interface Props {
  user: User;
}

export const UserCard = memo(function UserCard({ user }: Props) {
  const name = `${user.first_name} ${user.last_name}`;
  return (
    <article className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <Avatar src={user.avatar} name={name} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-slate-900">{name}</h3>
        <div className="mt-0.5 flex items-center justify-between gap-3 text-sm text-slate-600">
          <span className="truncate">{user.nationality}</span>
          <span className="shrink-0 tabular-nums">
            <span className="sr-only">Age </span>
            {user.age}
            <span aria-hidden="true"> yrs</span>
          </span>
        </div>
        <div className="mt-3">
          <HobbyBadges hobbies={user.hobbies} />
        </div>
      </div>
    </article>
  );
});
