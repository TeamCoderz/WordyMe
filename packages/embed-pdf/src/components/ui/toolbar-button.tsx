/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ReactNode, forwardRef } from 'react';
import { cn } from '@repo/ui/lib/utils';

type ToolbarButtonProps = {
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: ReactNode;
  'aria-label'?: string;
  title?: string;
  className?: string;
};

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (
    {
      onClick,
      isActive = false,
      disabled = false,
      children,
      'aria-label': ariaLabel,
      title,
      className = '',
    },
    ref,
  ) => {
    const baseClasses = isActive
      ? 'border-none bg-accent text-accent-foreground shadow ring ring-accent'
      : 'text-muted-foreground hover:bg-accent/75 hover:text-accent-foreground hover:ring hover:ring-accent';

    const disabledClasses = disabled
      ? 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-gray-600 hover:ring-0'
      : '';

    const mergedClasses = cn(
      'rounded p-1.5 transition-colors',
      baseClasses,
      disabledClasses,
      className,
    );

    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        className={mergedClasses}
        aria-label={ariaLabel}
        aria-pressed={isActive}
        aria-disabled={disabled}
        title={title || ariaLabel}
      >
        {children}
      </button>
    );
  },
);

ToolbarButton.displayName = 'ToolbarButton';
