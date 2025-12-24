import ThemeCustomizer from '@/components/Settings/Preferences/ThemeCustomizer';
import InterfacePreferencesSettings from '@/components/Settings/Preferences/InterfacePreferencesSettings';
import EditorPreferencesSettings from '@/components/Settings/Preferences/EditorPreferencesSettings';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { z } from 'zod';

const preferencesSearchSchema = z.object({
  section: z.enum(['theme', 'interface', 'editor', 'all']).optional().default('all'),
});

export const Route = createFileRoute('/_authed/settings/preferences')({
  component: RouteComponent,
  validateSearch: preferencesSearchSchema,
});

function RouteComponent() {
  const { section } = useSearch({ from: '/_authed/settings/preferences' });

  const renderThemeSection = () => (
    <Card id="theme" className="bg-transparent p-0 overflow-hidden gap-0">
      <CardHeader className="bg-card border-b p-5 block !pb-5">
        <CardTitle className="p-0 text-sm font-semibold">Theme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <ThemeCustomizer />
      </CardContent>
    </Card>
  );

  const renderSection = () => {
    switch (section) {
      case 'theme':
        return renderThemeSection();
      case 'interface':
        return <InterfacePreferencesSettings />;
      case 'editor':
        return <EditorPreferencesSettings />;
      case 'all':
      default:
        return (
          <>
            {renderThemeSection()}
            <InterfacePreferencesSettings />
            <EditorPreferencesSettings />
          </>
        );
    }
  };

  return <div className="space-y-6">{renderSection()}</div>;
}
// moved InterfacePreferencesSettings to components/Settings/Preferences
