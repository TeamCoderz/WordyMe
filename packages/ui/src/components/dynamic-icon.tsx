/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';

import * as React from 'react';
import { cn } from '@repo/ui/lib/utils';
import { LoaderIcon, LucideIcon, LucideProps } from '@repo/ui/components/icons';

import { createElement, forwardRef, JSX, useEffect, useState } from 'react';

interface DynamicIconComponentProps extends LucideProps {
  name: string;
  fallback?: () => JSX.Element | null;
}

function kebabToPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

async function getLucideIcon(name: string) {
  const module = await import('@repo/ui/components/icons');
  const pascalName = kebabToPascalCase(name);
  const icon = (module as unknown as Record<string, LucideIcon>)[pascalName];
  if (!icon) {
    throw new Error(`[lucide-react]: Icon "${name}" (${pascalName}) not found`);
  }
  return icon;
}

const LucideDynamicIcon = forwardRef<SVGSVGElement, DynamicIconComponentProps>(
  ({ name, fallback: Fallback, ...props }, ref) => {
    const [LucideIcon, setLucideIcon] = useState<LucideIcon>();

    useEffect(() => {
      getLucideIcon(name)
        .then(setLucideIcon)
        .catch((error) => {
          console.error(error);
        });
    }, [name]);

    if (LucideIcon == null) {
      if (Fallback == null) {
        return null;
      }

      return createElement(Fallback);
    }
    return <LucideIcon ref={ref} {...props} />;
  },
);

export default DynamicIcon;

type DynamicIconProps = React.ComponentProps<typeof LucideDynamicIcon>;

export function DynamicIcon(
  props: Omit<DynamicIconProps, 'name'> & {
    name?: string;
  },
) {
  const fallback =
    props.fallback ??
    (() => <LoaderIcon className={cn('h-4 w-4 animate-spin', props.className)} />);
  if (!props.name) {
    return fallback();
  }
  return (
    <LucideDynamicIcon
      {...props}
      name={props.name as DynamicIconProps['name']}
      fallback={fallback}
    />
  );
}
