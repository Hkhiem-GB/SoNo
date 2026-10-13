import React, { useState, useEffect } from 'react';
import { Lock, Delete, ShieldAlert } from 'lucide-react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useSecurity } from '@/context/SecurityContext';
import { useLanguage } from '@/context/LanguageContext';

export const PinLockScreen: React.FC = () => {
  const { unlock } = useSecurity();
  const { t } = useLanguage();

  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Trigger haptic feedback safely
  const triggerHaptic = async (type: 'tap' | 'error') => {
    try {
      if (type === 'tap') {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else {
        await Haptics.notification({ type: NotificationType.Error });
      }
    } catch {
      // Ignore if not supported on platform
    }
  };

  const handleKeyPress = (num: string) => {
    if (isVerifying || pin.length >= 4) return;
    triggerHaptic('tap');
    setErrorMsg(null);
    setPin((prev) => prev + num);
  };

  const handleDelete = () => {
    if (isVerifying || pin.length === 0) return;
    triggerHaptic('tap');
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  };

  // Verify PIN whenever 4 digits are completed
  useEffect(() => {
    if (pin.length === 4) {
      let isMounted = true;
      setIsVerifying(true);

      const verify = async () => {
        const success = await unlock(pin);
        if (!isMounted) return;

        if (!success) {
          triggerHaptic('error');
          setErrorMsg(t('pinIncorrect'));
          setIsShaking(true);
          setTimeout(() => {
            if (isMounted) {
              setIsShaking(false);
              setPin('');
              setIsVerifying(false);
            }
          }, 500);
        } else {
          setIsVerifying(false);
        }
      };

      verify();

      return () => {
        isMounted = false;
      };
    }
  }, [pin, unlock, t]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col justify-between px-6 py-12 select-none">
      {/* Top Header & Branding */}
      <div className="flex flex-col items-center pt-8 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/10">
          <Lock className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-xl font-black tracking-tight text-slate-100">
            {t('appName')}
          </h1>
          <p className="text-sm font-medium text-slate-400">
            {t('enterPinToUnlock')}
          </p>
        </div>

        {/* 4 PIN Dots */}
        <div
          className={`flex items-center space-x-5 pt-6 pb-2 transition-transform ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? errorMsg
                      ? 'bg-rose-500 scale-125 shadow-md shadow-rose-500/50'
                      : 'bg-indigo-400 scale-125 shadow-md shadow-indigo-500/50'
                    : 'border-2 border-slate-600 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        <div className="h-6">
          {errorMsg && (
            <p className="text-xs font-semibold text-rose-400 flex items-center space-x-1 animate-in fade-in">
              <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />
              <span>{errorMsg}</span>
            </p>
          )}
        </div>
      </div>

      {/* Numeric Keypad */}
      <div className="max-w-xs mx-auto w-full pb-6">
        <div className="grid grid-cols-3 gap-4 place-items-center">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying}
              onClick={() => handleKeyPress(digit)}
              className="w-18 h-18 rounded-full bg-slate-800/90 hover:bg-slate-700/90 active:scale-90 active:bg-indigo-600/40 text-2xl font-bold text-slate-100 transition shadow-sm border border-slate-700/60 flex items-center justify-center disabled:opacity-50"
            >
              {digit}
            </button>
          ))}

          {/* Empty spacer for bottom row */}
          <div className="w-18 h-18" />

          {/* Digit 0 */}
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleKeyPress('0')}
            className="w-18 h-18 rounded-full bg-slate-800/90 hover:bg-slate-700/90 active:scale-90 active:bg-indigo-600/40 text-2xl font-bold text-slate-100 transition shadow-sm border border-slate-700/60 flex items-center justify-center disabled:opacity-50"
          >
            0
          </button>

          {/* Delete button */}
          <button
            type="button"
            disabled={isVerifying || pin.length === 0}
            onClick={handleDelete}
            aria-label="Xóa"
            className="w-18 h-18 rounded-full bg-slate-800/50 hover:bg-slate-700/50 active:scale-90 text-slate-300 transition flex items-center justify-center disabled:opacity-20"
          >
            <Delete className="w-6 h-6 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
};

