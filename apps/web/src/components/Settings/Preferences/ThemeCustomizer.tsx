/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Separator } from '@repo/ui/components/separator';
import ThemeSelect from './ThemeSelect';
import ColorThemeSelector from './ColorThemeSelector';

function ThemeCustomizer() {
  return (
    <>
      <ThemeSelect />
      <Separator className="bg-transparent border-t border-dashed h-0" />
      <ColorThemeSelector />
    </>
  );
}

export default ThemeCustomizer;
