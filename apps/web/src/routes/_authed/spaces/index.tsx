/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createFileRoute, Navigate } from '@tanstack/react-router';
export const Route = createFileRoute('/_authed/spaces/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate to="/spaces/manage" />;
}
