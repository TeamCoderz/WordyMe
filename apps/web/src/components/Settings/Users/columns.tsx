/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type ColumnDef } from '@tanstack/react-table';

import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Link } from '@tanstack/react-router';
import { SettingsUser } from '@repo/types';

export const userColumns: ColumnDef<SettingsUser>[] = [
  {
    accessorKey: 'name',
    header: 'User',
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Link to={`/settings/users/${user.id}` as any} className="flex items-center gap-3 group">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar || '/placeholder.svg'} alt={user.name} />
            <AvatarFallback className="bg-gray-700 text-gray-300">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-blue-400 group-hover:underline decoration-blue-400 font-medium">
              {user.name}
            </span>
            <span className="text-gray-400 text-sm group-hover:underline decoration-blue-400">
              {user.email}
            </span>
          </div>
        </Link>
      );
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.original.role;
      return (
        <Link
          to={`/settings/roles/${role.id}` as any}
          className="text-blue-400 hover:underline decoration-blue-400 font-medium"
        >
          {role.name}
        </Link>
      );
    },
  },
  {
    accessorKey: 'lastActivity',
    header: 'Activity',
    cell: ({ row }) => {
      const lastActivity = row.getValue('lastActivity') as string;
      return lastActivity ? (
        <div className="flex flex-col items-end">
          <span className="text-gray-400 text-sm">Latest Activity</span>
          <span className="text-gray-300 text-sm">{lastActivity}</span>
        </div>
      ) : (
        <span className="text-gray-500 text-sm">No activity</span>
      );
    },
  },
];
