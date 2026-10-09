import React, { createContext, useContext, useEffect, useState } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { settingsRepository } from '@/repositories/settingsRepository';
import type { ThemeMode } from '@/types';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState<boolean>(false);

  const applyTheme = async (mode: ThemeMode) => {
    let effectiveDark = false;
    if (mode === 'dark') {
      effectiveDark = true;
    } else if (mode === 'light') {
      effectiveDark = false;
    } else {
      // system
      effectiveDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    setIsDark(effectiveDark);

    if (effectiveDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Configure Android status bar dynamically if native
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.setStyle({
          style: effectiveDark ? Style.Dark : Style.Light,
        });
        await StatusBar.setBackgroundColor({
          color: effectiveDark ? '#020617' : '#f8fafc',
        });
      } catch (err) {
        // Safe ignore on unsupported platforms
      }
    }
  };

  useEffect(() => {
    // Load persisted theme from SQLite
    settingsRepository.get('theme', 'system').then((savedTheme) => {
      const mode = (savedTheme as ThemeMode) || 'system';
      setThemeState(mode);
      applyTheme(mode);
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);
    await applyTheme(mode);
    await settingsRepository.set('theme', mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
