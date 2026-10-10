import React, { createContext, useContext, useEffect } from 'react';
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
  const theme: ThemeMode = 'light';
  const isDark = false;

  useEffect(() => {
    // Ensure document never has dark mode class
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sono_theme');
    }

    // Configure Android status bar to crisp light style with pure white background
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({
        style: Style.Light,
      }).catch(() => {});
      StatusBar.setBackgroundColor({
        color: '#ffffff',
      }).catch(() => {});
    }

    // Keep database in sync
    settingsRepository.set('theme', 'light').catch(() => {});
  }, []);

  const setTheme = async (_mode: ThemeMode) => {
    // Default locked to light mode
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
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
