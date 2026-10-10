import React, { useEffect, useState } from 'react';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

interface SplashScreenProps {
  onFinish: () => void;
  isReady?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, isReady = true }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [hardTimeoutFired, setHardTimeoutFired] = useState(false);

  useEffect(() => {
    // Hide native splash screen so React Splash Screen takes over seamlessly
    if (Capacitor.isPluginAvailable('SplashScreen')) {
      CapacitorSplashScreen.hide({
        fadeOutDuration: 300,
      }).catch(() => {
        // Safe ignore
      });
    }

    // Minimum display time for smooth brand intro (750ms)
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 750);

    // Hard fallback timeout: Splash Screen NEVER stays stuck indefinitely (4000ms)
    const safetyTimeout = setTimeout(() => {
      setHardTimeoutFired(true);
    }, 4000);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(safetyTimeout);
    };
  }, []);

  useEffect(() => {
    // Dismiss ONLY when BOTH minimum brand animation time has elapsed AND SQLite data is fully ready
    if ((minTimeElapsed && isReady) || hardTimeoutFired) {
      setIsFadingOut(true);
      const exitTimer = setTimeout(() => {
        onFinish();
      }, 300); // 300ms smooth CSS opacity fade out transition

      return () => clearTimeout(exitTimer);
    }
  }, [minTimeElapsed, isReady, hardTimeoutFired, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#e6f7f0] text-slate-900 select-none transition-opacity duration-350 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center px-6 animate-in fade-in zoom-in-95 duration-500">
        {/* Brand Logo with Glow */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-emerald-400/25 rounded-full blur-xl animate-pulse" />
          <img
            src="/logo.svg"
            alt="Sổ Nợ Logo"
            className="w-28 h-28 sm:w-32 sm:h-32 relative drop-shadow-xl rounded-3xl"
          />
        </div>

        {/* App Title */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-2 font-heading">
          Sổ Nợ
        </h1>

        {/* Slogan */}
        <p className="text-sm sm:text-base font-medium text-slate-600 tracking-wide">
          Quản lý nợ, rõ từng khoản
        </p>

        {/* Subtle Minimal Loader indicator */}
        <div className="mt-8 flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 opacity-80" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 opacity-60" />
        </div>
      </div>
    </div>
  );
};
