'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { ModeValue, ScaleValue, THEME_BY_VALUE, ThemeValue } from './themes';

type ThemeConfig = {
  theme: ThemeValue;
  scale: ScaleValue;
  mode: ModeValue;
  color: (typeof THEME_BY_VALUE)[ThemeValue]['color-variants'][number]['value'];
  animations: 'on' | 'off';
};

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ThemeValue;
  defaultAnimations?: 'on' | 'off';
  defaultScale?: ScaleValue;
  defaultMode?: ModeValue;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: ThemeValue;
  setTheme: (theme: ThemeValue) => void;
  scale: ScaleValue;
  setScale: (scale: ScaleValue) => void;
  mode: ModeValue;
  setMode: (mode: ModeValue) => void;
  color: ThemeConfig['color'];
  setColor: (color: ThemeConfig['color']) => void;
  animations: 'on' | 'off';
  setAnimations: (animations: 'on' | 'off') => void;
};

const DEFAULT_MODE: ModeValue = 'light';
const DEFAULT_THEME: ThemeValue = 'new-york';
const DEFAULT_SCALE: ScaleValue = 'medium';

const initialState: ThemeProviderState = {
  theme: DEFAULT_THEME,
  setTheme: () => null,
  scale: DEFAULT_SCALE,
  setScale: () => null,
  mode: DEFAULT_MODE,
  setMode: () => null,
  color: THEME_BY_VALUE[DEFAULT_THEME]['color-variants'][0].value,
  setColor: () => null,
  animations: 'on',
  setAnimations: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function getStoredConfig(storageKey: string): ThemeConfig | null {
  if (typeof window === 'undefined') {
    return {
      theme: DEFAULT_THEME,
      scale: DEFAULT_SCALE,
      mode: DEFAULT_MODE,
      color: THEME_BY_VALUE[DEFAULT_THEME]['color-variants'][0].value,
      animations: 'on',
    };
  }

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error parsing stored theme config:', e);
  }

  // Return null if no stored config exists, so we can distinguish
  // between no user preference and explicit user preference
  return null;
}

function setStoredConfig(storageKey: string, config: ThemeConfig) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(storageKey, JSON.stringify(config));
  } catch (e) {
    console.error('Error storing theme config:', e);
  }
}

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  defaultScale = DEFAULT_SCALE,
  defaultMode = DEFAULT_MODE,
  defaultAnimations = 'on',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const storedConfig = getStoredConfig(storageKey);

  const [mode, setModeState] = useState<ModeValue>(storedConfig?.mode || defaultMode);
  const [scale, setScaleState] = useState<ScaleValue>(storedConfig?.scale || defaultScale);
  const [theme, setThemeState] = useState<ThemeValue>(storedConfig?.theme || defaultTheme);
  const [color, setColorState] = useState<ThemeConfig['color']>(
    storedConfig?.color || THEME_BY_VALUE[theme]['color-variants'][0].value,
  );
  const [animations, setAnimations] = useState<'on' | 'off'>(
    storedConfig?.animations || defaultAnimations,
  );

  useEffect(() => {
    setStoredConfig(storageKey, { theme, scale, mode, color, animations });
  }, [theme, scale, mode, color, animations, storageKey]);
  useEffect(() => {
    if (!THEME_BY_VALUE[theme]) setThemeState('new-york');
  }, [theme]);
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (mode === 'system') {
      const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

      root.classList.add(systemMode);
    } else {
      root.classList.add(mode);
    }

    root.classList.forEach((className) => {
      if (className.startsWith('scale-')) {
        root.classList.remove(className);
      }
    });
    root.classList.add(`scale-${scale}`);

    root.classList.forEach((className) => {
      if (className.startsWith('theme-')) {
        root.classList.remove(className);
      }
    });
    root.classList.add(`theme-${theme}`);
    root.classList.forEach((className) => {
      if (className.startsWith('color-')) {
        root.classList.remove(className);
      }
    });
    root.classList.add(`color-${color}`);
    if (root.classList.contains('no-animations')) {
      if (animations === 'on') {
        root.classList.remove('no-animations');
      }
    } else {
      if (animations === 'off') {
        root.classList.add('no-animations');
      }
    }
  }, [theme, scale, mode, color, animations]);

  const setTheme = (newTheme: ThemeValue) => {
    setThemeState(newTheme);
    setColor(THEME_BY_VALUE[newTheme]['color-variants'][0].value);
  };

  const setScale = (newScale: ScaleValue) => {
    setScaleState(newScale);
  };

  const setMode = (newMode: ModeValue) => {
    setModeState(newMode);
  };
  const setColor = (newColor: ThemeConfig['color']) => {
    setColorState(newColor);
  };

  const value = {
    theme,
    setTheme,
    scale,
    setScale,
    mode,
    setMode,
    color,
    setColor,
    animations,
    setAnimations,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
