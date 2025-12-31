'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';
import { buttonVariants } from '@repo/ui/components/button';

export type AlertOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  buttonVariant?: 'default' | 'destructive';
};

type ResolveFunction = (value: boolean) => void;

type AlertStore = {
  showAlert: (options: AlertOptions, resolve?: ResolveFunction) => void;
};

const store: AlertStore = {
  showAlert: () => {
    console.warn('Alert function called before component was mounted');
  },
};

// eslint-disable-next-line react-refresh/only-export-components
export function alert(options: AlertOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    store.showAlert(options, resolve);
  });
}

export function Alert() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({
    title: 'Are you sure?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    buttonVariant: 'default',
  });
  const resolvePromiseRef = useRef<ResolveFunction | null>(null);

  useEffect(() => {
    store.showAlert = (newOptions: AlertOptions, resolve?: ResolveFunction) => {
      setOptions({
        ...newOptions,
        confirmText: newOptions.confirmText || 'Confirm',
        cancelText: newOptions.cancelText || 'Cancel',
        onConfirm: newOptions.onConfirm || (() => {}),
        onCancel: newOptions.onCancel || (() => {}),
        buttonVariant: newOptions.buttonVariant || 'default',
      });
      resolvePromiseRef.current = resolve || null;
      setIsOpen(true);
    };

    return () => {
      // If component unmounts while a blocking alert is open, resolve with false
      if (resolvePromiseRef.current) {
        resolvePromiseRef.current(false);
        resolvePromiseRef.current = null;
      }
      store.showAlert = () => {
        console.warn('Alert function called after component was unmounted');
      };
    };
  }, []);

  const handleConfirm = useCallback(async () => {
    if (options.onConfirm) {
      await options.onConfirm();
    }
    if (resolvePromiseRef.current) {
      resolvePromiseRef.current(true);
      resolvePromiseRef.current = null;
    }
    setIsOpen(false);
  }, [options]);

  const handleCancel = useCallback(async () => {
    if (options.onCancel) {
      await options.onCancel();
    }
    if (resolvePromiseRef.current) {
      resolvePromiseRef.current(false);
      resolvePromiseRef.current = null;
    }
    setIsOpen(false);
  }, [options]);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="m-0">{options.title}</AlertDialogTitle>
          {options.description && (
            <AlertDialogDescription className="mb-0">{options.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>{options.cancelText}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: options.buttonVariant })}
            onClick={handleConfirm}
          >
            {options.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
