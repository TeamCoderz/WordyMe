/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { roleColumns } from './columns';
import DataTable from '@/components/DataTable';
// import { getRoles } from "@/actions/roles.actions";
function RolesTable() {
  // const roles = await getRoles({
  //   search: searchParams.get("search") ?? "",
  //   sort: searchParams.get("sort") ?? "name",
  //   order: searchParams.get("order") ?? "asc",
  // });
  return (
    <DataTable
      columns={roleColumns}
      data={[
        {
          assigned_users: 0,
          id: '1',
          name: 'Admin',
          permissions: [],
          description: 'Admin',
        },
      ]}
    />
  );
}

export default RolesTable;
