export type SettingsRole = {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
  assigned_users: number;
};
