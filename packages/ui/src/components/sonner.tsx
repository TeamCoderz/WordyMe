'use client';
import { Toaster as Sonner, ToasterProps, toast } from 'sonner';
import { useTheme } from '../theme/theme-provider';

const Toaster = ({ forceMode, ...props }: ToasterProps & { forceMode?: 'light' | 'dark' }) => {
  const { mode } = useTheme();

  return (
    <Sonner
      theme={forceMode ?? mode}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster, toast };
