import PersonalInformation from '@/components/Settings/Profile/PersonalInformation';
import DeleteAccount from '@/components/Settings/Profile/DeleteAccount';
import AccountInformation from '@/components/Settings/Profile/AccountInformation';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { z } from 'zod';

const profileSearchSchema = z.object({
  section: z.enum(['personal', 'account', 'danger', 'all']).optional().default('all'),
});

export const Route = createFileRoute('/_authed/settings/profile')({
  component: RouteComponent,
  validateSearch: profileSearchSchema,
});

function RouteComponent() {
  const { section } = useSearch({ from: '/_authed/settings/profile' });

  const renderSection = () => {
    switch (section) {
      case 'personal':
        return <PersonalInformation />;
      case 'account':
        return <AccountInformation />;
      case 'danger':
        return <DeleteAccount />;
      case 'all':
      default:
        return (
          <>
            <PersonalInformation />
            <AccountInformation />
            <DeleteAccount />
          </>
        );
    }
  };

  return <div className="space-y-6">{renderSection()}</div>;
}
