import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { pinService } from '@/services/pinService';

interface SecurityContextType {
  isPinSet: boolean;
  isLocked: boolean;
  isLoadingSecurity: boolean;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  setupPin: (pin: string) => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  disablePin: (currentPin: string) => Promise<boolean>;
  refreshSecurityStatus: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPinSet, setIsPinSet] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(true);

  const refreshSecurityStatus = useCallback(async () => {
    try {
      const enabled = await pinService.isPinEnabled();
      setIsPinSet(enabled);
      if (enabled) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } finally {
      setIsLoadingSecurity(false);
    }
  }, []);

  useEffect(() => {
    refreshSecurityStatus();
  }, [refreshSecurityStatus]);

  // Auto-lock when user leaves the app (background/recent apps)
  useEffect(() => {
    let handle: { remove: () => Promise<void> } | null = null;

    const setupListener = async () => {
      try {
        handle = await CapApp.addListener('appStateChange', (state) => {
          if (!state.isActive && isPinSet) {
            setIsLocked(true);
          }
        });
      } catch (err) {
        // Fallback or web environment where CapApp is inactive
      }
    };

    if (isPinSet) {
      setupListener();
    }

    return () => {
      if (handle) {
        handle.remove().catch(() => {});
      }
    };
  }, [isPinSet]);

  const unlock = async (pin: string): Promise<boolean> => {
    const isValid = await pinService.verifyPin(pin);
    if (isValid) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lock = () => {
    if (isPinSet) {
      setIsLocked(true);
    }
  };

  const setupPin = async (pin: string): Promise<void> => {
    await pinService.setPin(pin);
    setIsPinSet(true);
    setIsLocked(false);
  };

  const changePin = async (oldPin: string, newPin: string): Promise<boolean> => {
    const isValid = await pinService.verifyPin(oldPin);
    if (!isValid) return false;
    await pinService.setPin(newPin);
    return true;
  };

  const disablePin = async (currentPin: string): Promise<boolean> => {
    const isValid = await pinService.verifyPin(currentPin);
    if (!isValid) return false;
    await pinService.disablePin();
    setIsPinSet(false);
    setIsLocked(false);
    return true;
  };

  return (
    <SecurityContext.Provider
      value={{
        isPinSet,
        isLocked,
        isLoadingSecurity,
        unlock,
        lock,
        setupPin,
        changePin,
        disablePin,
        refreshSecurityStatus,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const ctx = useContext(SecurityContext);
  if (!ctx) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return ctx;
};

