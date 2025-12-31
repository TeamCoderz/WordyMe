import { Link, useLocation } from '@tanstack/react-router';
import { Palette, UserRound } from '@repo/ui/components/icons';
import { cn } from '@repo/ui/lib/utils';

export default function SettingsNav() {
  const location = useLocation();
  const currentSection = location.search?.section || 'all';
  const isPreferencesPage = location.pathname.includes('/preferences');
  const isProfilePage = location.pathname.includes('/profile');

  const headingBase =
    'flex items-center gap-2 w-full rounded-md px-3 text-muted-foreground py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground';
  const sublink = 'block px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground';
  const activeSublinkClass = 'text-foreground rounded-md bg-accent/50';

  return (
    <nav className="lg:sticky lg:top-20 h-fit space-y-6">
      <div>
        <Link
          to="/settings/profile"
          search={{ section: 'all' }}
          activeOptions={{ exact: false }}
          className={headingBase}
        >
          <UserRound className="h-4 w-4" />
          Account
        </Link>
        <div className="mt-2 ml-5 border-l pl-3 space-y-1">
          <Link
            to="/settings/profile"
            search={{ section: 'personal' }}
            className={cn(
              sublink,
              isProfilePage && currentSection === 'personal' && activeSublinkClass,
            )}
          >
            Personal information
          </Link>
          <Link
            to="/settings/profile"
            search={{ section: 'account' }}
            className={cn(
              sublink,
              isProfilePage && currentSection === 'account' && activeSublinkClass,
            )}
          >
            Account information
          </Link>
          <Link
            to="/settings/profile"
            search={{ section: 'danger' }}
            className={cn(
              sublink,
              isProfilePage && currentSection === 'danger' && activeSublinkClass,
            )}
          >
            Danger zone
          </Link>
        </div>
      </div>

      <div>
        <Link
          to="/settings/preferences"
          search={{ section: 'all' }}
          activeOptions={{ exact: false }}
          className={headingBase}
        >
          <Palette className="h-4 w-4" />
          Preferences
        </Link>
        <div className="mt-2 ml-5 border-l pl-3 space-y-1">
          <Link
            to="/settings/preferences"
            search={{ section: 'theme' }}
            className={cn(
              sublink,
              isPreferencesPage && currentSection === 'theme' && activeSublinkClass,
            )}
          >
            Theme
          </Link>
          <Link
            to="/settings/preferences"
            search={{ section: 'interface' }}
            className={cn(
              sublink,
              isPreferencesPage && currentSection === 'interface' && activeSublinkClass,
            )}
          >
            Interface preferences
          </Link>
          <Link
            to="/settings/preferences"
            search={{ section: 'editor' }}
            className={cn(
              sublink,
              isPreferencesPage && currentSection === 'editor' && activeSublinkClass,
            )}
          >
            Editor preferences
          </Link>
        </div>
      </div>
    </nav>
  );
}
