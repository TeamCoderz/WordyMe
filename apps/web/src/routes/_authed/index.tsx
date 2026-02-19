/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/components/Home';

export const Route = createFileRoute('/_authed/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <HomePage />;
}
