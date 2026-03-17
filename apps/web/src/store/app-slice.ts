/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { StateCreator } from 'zustand/vanilla';
import type { Store } from './store';
import { TopBarFormValues } from '@/schemas/top-bar-form.schema';

export type AppState = {
  topBarSettings: any; // TODO: Add proper type
  instanceSettings: TopBarFormValues | null;
  version: string | null;
  deployment_id: string | null;
};

export type AppActions = {
  setInstanceSettingsLocal: (settings: TopBarFormValues) => void;
  setInstanceName: (name: string) => void;
  setInstanceLogo: (logo: string) => void;
  setEndColor: (color: string) => void;
  setStartColor: (color: string) => void;
  setTopBarTheme: (theme: string) => void;
  setDirection: (direction: 'right' | 'bottom' | 'left' | 'top') => void;
  setIsGradient: (isGradient: boolean) => void;
  setVersion: (version: string) => void;
  setDeploymentId: (deploymentId: string) => void;
};

export type AppSlice = { app: AppState; appActions: AppActions };

const initialState: AppState = {
  topBarSettings: null,
  instanceSettings: null,
  version: null,
  deployment_id: null,
};

export const createAppSlice: StateCreator<
  Store,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  AppSlice
> = (set) => {
  return {
    app: initialState,
    appActions: {
      setInstanceSettingsLocal: (settings) => {
        set((state) => ({
          app: { ...state.app, instanceSettings: settings },
        }));
      },
      setInstanceName: (name: string) => {
        set((state) => ({
          app: {
            ...state.app,
            instanceSettings: state.app.instanceSettings
              ? { ...state.app.instanceSettings, instance_name: name }
              : null,
          },
        }));
      },
      setInstanceLogo: (logo: string) => {
        set((state) => ({
          app: {
            ...state.app,
            instanceSettings: state.app.instanceSettings
              ? { ...state.app.instanceSettings, instance_logo: logo }
              : null,
          },
        }));
      },
      setEndColor: (color: string) => {
        set((state) => ({
          app: {
            ...state.app,
            instanceSettings: state.app.instanceSettings
              ? { ...state.app.instanceSettings, top_bar_end_color: color }
              : null,
          },
        }));
      },
      setStartColor: (color: string) => {
        set((state) => ({
          app: {
            ...state.app,
            instanceSettings: state.app.instanceSettings
              ? { ...state.app.instanceSettings, top_bar_start_color: color }
              : null,
          },
        }));
      },
      setTopBarTheme: (theme: string) => {
        set((state) => ({
          app: {
            ...state.app,
            instanceSettings: state.app.instanceSettings
              ? { ...state.app.instanceSettings, top_bar_theme_color: theme }
              : null,
          },
        }));
      },
      setDirection: (direction: 'right' | 'bottom' | 'left' | 'top') => {
        set((state) => ({
          app: {
            ...state.app,
            instanceSettings: state.app.instanceSettings
              ? {
                  ...state.app.instanceSettings,
                  top_bar_gradient_direction: direction,
                }
              : null,
          },
        }));
      },
      setIsGradient: (isGradient: boolean) => {
        set((state) => ({
          app: {
            ...state.app,
            instanceSettings: state.app.instanceSettings
              ? {
                  ...state.app.instanceSettings,
                  ...(isGradient
                    ? {
                        top_bar_gradient: true,
                        top_bar_start_color: 'default',
                        top_bar_end_color: 'default',
                        top_bar_gradient_direction: 'right',
                      }
                    : {
                        top_bar_gradient: false,
                        top_bar_theme_color: 'default',
                      }),
                }
              : null,
          },
        }));
      },
      setVersion: (version: string) => {
        set((state) => ({
          app: { ...state.app, version: version },
        }));
      },
      setDeploymentId: (deploymentId: string) => {
        set((state) => ({
          app: { ...state.app, deployment_id: deploymentId },
        }));
      },
    },
  };
};
