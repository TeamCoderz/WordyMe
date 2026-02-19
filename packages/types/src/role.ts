/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type SettingsRole = {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
  assigned_users: number;
};
