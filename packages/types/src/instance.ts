export type InstanceSettings = {
  id: number;
  instance_id: string;
  instance_name: string;
  instance_logo: string | null;
  top_bar_theme_color: string | null;
  top_bar_gradient: boolean;
  top_bar_gradient_direction?: 'right' | 'bottom' | 'left' | 'top' | null;
  top_bar_start_color?: string | null;
  top_bar_end_color?: string | null;
  created_at: string;
  updated_at?: string;
};

export type InstanceSettingsData = {
  instance_name: string;
  instance_logo: string;
  top_bar_theme_color: string;
  top_bar_gradient: boolean;
  top_bar_gradient_direction?: 'right' | 'bottom' | 'left' | 'top';
  top_bar_start_color?: string;
  top_bar_end_color?: string;
};
