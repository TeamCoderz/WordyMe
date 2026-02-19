/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/docs/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate to="/docs/manage" />;
}
