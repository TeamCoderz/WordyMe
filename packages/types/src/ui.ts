export interface Alert {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}
export interface Announcement {
  id?: string;
  type?: 'loading' | 'success' | 'error' | 'warning' | 'info';
  message: { title: string; subtitle?: string };
  action?: {
    label: string;
    onClick: () => void;
  };
  timeout?: number;
}
