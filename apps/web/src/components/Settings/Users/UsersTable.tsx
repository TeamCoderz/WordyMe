/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// import { useSearch } from "@tanstack/react-router";
import { userColumns } from './columns';
import DataTable from '@/components/DataTable';
// import { getUsers } from "@/actions/users.actions";

function UsersTable() {
  // const data = useSearch({ from: "/_authed/settings/users" });
  // const users = await getUsers({
  //   search: searchParams.get("search") ?? "",
  //   sort: searchParams.get("sort") ?? "name",
  //   order: searchParams.get("order") ?? "asc",
  // });
  return (
    <DataTable
      columns={userColumns}
      data={[
        {
          id: '1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: {
            id: '1',
            name: 'Admin',
            description: 'Admin',
          },
        },
      ]}
    />
  );
}

export default UsersTable;
