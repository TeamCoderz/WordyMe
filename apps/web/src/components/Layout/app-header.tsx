import logo from '@/logo.webp';
import { SidebarTrigger } from '@repo/ui/components/sidebar';
import { useEffect } from 'react';
import { ThemeCustomizer } from '@repo/ui/theme/theme-customizer';
import { NavUser } from './nav-user';
import { cn } from '@repo/ui/lib/utils';
import { useSelector } from '@/store';
import { Link } from '@tanstack/react-router';
import { usePostHog } from 'posthog-js/react';

export const AppHeader = () => {
  const posthog = usePostHog();
  const user = useSelector((state) => state.user);
  const handleResize = () => {
    const keyboardInsetHeight =
      window.innerHeight - (window.visualViewport?.height || window.innerHeight);
    document.documentElement.style.setProperty(
      '--keyboard-inset-height',
      `${keyboardInsetHeight}px`,
    );
  };

  useEffect(() => {
    if (!window.visualViewport) return;
    window.visualViewport.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      <header
        className={cn(
          'group group/app-header text-accent-foreground sticky top-0 z-50 flex w-full items-center border-b bg-background',
        )}
      >
        <div className="flex w-full h-14 items-center overflow-hidden">
          <div
            className={cn(
              'flex justify-between items-center gap-2 h-full px-4 bg-top-bar-primary shrink-0',
              'w-28 sm:w-56 md:w-(--sidebar-width) md:border-r transition-[width] duration-100 ease-linear',
              'max-sm:group-has-[#app-toolbar:empty]/app-header:w-56',
            )}
          >
            <Link to="/" className="flex items-center font-logo gap-2 shrink-0">
              <img src={logo} alt="Wordy" className="size-8" />
              <p className="hidden max-sm:group-has-[#app-toolbar:empty]/app-header:block sm:block font-extrabold text-lg font-logo">
                Wordy
              </p>
            </Link>
            <SidebarTrigger variant="outline" className="size-9 !p-2" />
          </div>
          <div className="flex flex-1 items-center gap-2 px-4 h-full max-md:pl-0 justify-end bg-top-bar-secondary md:bg-background">
            <div
              id="app-toolbar"
              className="flex flex-1 w-0 justify-between items-center gap-2 overflow-auto scrollbar-hide"
            />
            <ThemeCustomizer
              beforeScaleChange={({ percent, scale }) => {
                posthog.capture('theme_scale_changed', {
                  scale_percentage: percent,
                  scale_value: scale,
                  user_id: user?.id,
                  username: user?.name,
                });
              }}
            />
            <NavUser variant="avatar" dropdownMenuSide="bottom" className="w-auto size-8" />
          </div>
        </div>
      </header>
    </>
  );
};
