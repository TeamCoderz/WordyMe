/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createFileRoute, useSearch } from '@tanstack/react-router';
import { z } from 'zod';
import { BackupExportSection, BackupRestoreSection } from '@/components/Settings/Backup';

const backupSearchSchema = z.object({
  section: z.enum(['export', 'restore', 'all']).optional().default('all'),
});

export const Route = createFileRoute('/_authed/settings/backup')({
  component: RouteComponent,
  validateSearch: backupSearchSchema,
});

function RouteComponent() {
  const { section } = useSearch({ from: '/_authed/settings/backup' });

  const renderSection = () => {
    switch (section) {
      case 'export':
        return <BackupExportSection />;
      case 'restore':
        return <BackupRestoreSection />;
      case 'all':
      default:
        return (
          <>
            <BackupExportSection />
            <BackupRestoreSection />
          </>
        );
    }
  };

  return <div className="space-y-10">{renderSection()}</div>;
}
