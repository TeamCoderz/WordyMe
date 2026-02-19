/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import logo from '@/logo.webp';
import { cn } from '@repo/ui/lib/utils';

const SplashScreen: React.FC<{
  title?: string;
  subtitle?: string;
  className?: string;
}> = ({ title, subtitle, className }) => {
  return (
    <div
      className={cn(
        'fixed inset-0 flex justify-center items-center z-[50] bg-background',
        className,
      )}
    >
      <div className="flex flex-col gap-4 min-w-[192px] max-w-[75vw] text-center -mt-14">
        <img src={logo} alt="Logo" width={192} className="mx-auto block h-auto animate-pulse" />
        {title && <p className="text-xs uppercase tracking-widest text-center">{title}</p>}
        {subtitle && <p className="text-sm text-muted-foreground text-center">{subtitle}</p>}
      </div>
    </div>
  );
};

export default SplashScreen;
