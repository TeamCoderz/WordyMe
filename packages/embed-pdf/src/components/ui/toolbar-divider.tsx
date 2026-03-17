/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

type ToolbarDividerProps = {
  orientation?: 'vertical' | 'horizontal';
  className?: string;
};

export function ToolbarDivider({ orientation = 'vertical', className = '' }: ToolbarDividerProps) {
  const dividerClasses =
    orientation === 'horizontal'
      ? `my-1 h-px w-full bg-border ${className}`
      : `mx-1 h-6 w-px bg-border ${className}`;

  return <div className={dividerClasses} />;
}
