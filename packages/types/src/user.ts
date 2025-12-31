import { SettingsRole } from './role';

export interface User {
  id: string;
  name?: string | null;
  handle?: string | null;
  email?: string | null;
  image?: string | null;
}

export type SettingsUser = {
  id: string;
  name: string;
  email: string;
  role: Omit<SettingsRole, 'permissions' | 'assigned_users'>;
  avatar?: string;
  lastActivity?: string;
};
