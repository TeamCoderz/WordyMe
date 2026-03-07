/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/settings/')({
  beforeLoad: ({ cause }) => {
    if (cause !== 'preload') {
      throw redirect({ to: '/settings/profile' });
    }
  },
});
