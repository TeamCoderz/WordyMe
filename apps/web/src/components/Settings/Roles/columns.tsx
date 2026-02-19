/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type ColumnDef } from '@tanstack/react-table';

import { Link } from '@tanstack/react-router';
import { SettingsRole } from '@repo/types/role';

export const roleColumns: ColumnDef<SettingsRole>[] = [
  {
    accessorKey: 'name',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.original;
      return (
        <Link to={`/settings/roles/${role.id}` as any} className="flex items-center gap-3 group">
          <div className="flex flex-col">
            <span className="text-blue-400 group-hover:underline decoration-blue-400 font-medium">
              {role.name}
            </span>
            <span className="text-gray-400 text-sm">{role.description}</span>
          </div>
        </Link>
      );
    },
  },
  {
    accessorKey: 'assigned_users',
    header: '',
    cell: ({ row }) => {
      const role = row.original;
      return (
        <div className="flex flex-col items-end">
          <span className="text-gray-400 text-sm">{role.assigned_users} users assigned</span>
          <span className="text-gray-300 text-sm">{role.permissions.length} permissions</span>
        </div>
      );
    },
  },
];
