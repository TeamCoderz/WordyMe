/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { MoonIcon, SunIcon } from '@repo/ui/components/icons';
import { Button } from '../components/button';
import { useTheme } from './theme-provider';

export function ModeToggle(props: React.ComponentProps<typeof Button>) {
  const { mode, setMode } = useTheme();

  const toggleMode = () => {
    const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const resolvedMode = mode === 'system' ? systemMode : mode;
    setMode(resolvedMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleMode} {...props}>
      <SunIcon className="hidden [html.dark_&]:block" />
      <MoonIcon className="hidden [html.light_&]:block" />
      <span className="sr-only">Toggle mode</span>
    </Button>
  );
}
