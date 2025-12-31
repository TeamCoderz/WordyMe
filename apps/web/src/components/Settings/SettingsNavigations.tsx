import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
import { Link, useLocation } from '@tanstack/react-router';
const SETTINGS_NAVIGATIONS = [
  {
    label: 'Account',
    value: '/settings/account',
  },
  {
    label: 'Preferences',
    value: '/settings/preferences',
  },
  {
    label: 'Profile',
    value: '/settings/profile',
  },
  {
    label: 'Admin',
    value: '/settings/admin',
  },
] as const;
function SettingsNavigations() {
  const { pathname } = useLocation();
  let tabValue = pathname;
  if (tabValue.includes('/settings/users')) {
    tabValue = '/settings/users';
  }
  if (tabValue.includes('/settings/roles')) {
    tabValue = '/settings/roles';
  }
  return (
    <Tabs value={tabValue}>
      <TabsList className="flex gap-2 h-fit *:!w-full">
        {SETTINGS_NAVIGATIONS.map(({ label, value }) => (
          <TabsTrigger
            key={value}
            className="data-[state=active]:dark:bg-primary data-[state=active]:dark:text-primary-foreground text-foreground"
            value={value}
            asChild
          >
            <Link to={value as any}>{label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export default SettingsNavigations;
