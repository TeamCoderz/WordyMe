/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type NavigationItem = {
  id: string;
  title: string;
  url: string;
  icon?: string;
  items?: NavigationItem[];
  requiredPermissions?: string[];
};

export type NavigationSection = {
  id: string;
  title: string;
  items: NavigationItem[];
};

export type NavigationConfig = {
  spaces?: {
    id: string;
    name: string;
    logo: string;
    plan: string;
  }[];
  main?: NavigationSection[];
  secondary?: NavigationItem[];
  documents?: NavigationItem[];
};
