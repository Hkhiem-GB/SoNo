import React, { useState } from 'react';
import { X, ShieldCheck, KeyRound, ShieldOff, Delete, AlertCircle } from 'lucide-react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useSecurity } from '@/context/SecurityContext';
import { useLanguage } from '@/context/LanguageContext';

export type PinModalMode = 'setup' | 'change' | 'disable';

interface PinSetupModalProps {
  isOpen: boolean;
  mode: PinModalMode;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  isOpen,
  mode,
  onClose,
  onSuccess,
}) => {
  const { setupPin, changePin, disablePin } = useSecurity();
  const { t } = useLanguage();

  // Internal step tracking
  // setup: 1 (enter new) -> 2 (confirm new)
  // change: 1 (enter old) -> 2 (enter new) -> 3 (confirm new)
  // disable: 1 (enter old)
  const [step, setStep] = useState<number>(1);
  const [pinCurrent, setPinCurrent] = useState<string>('');
  const [pinNew, setPinNew] = useState<string>('');
  const [pinConfirm, setPinConfirm] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const triggerHaptic = async (type: 'tap' | 'error') => {
    try {
      if (type === 'tap') {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else {
        await Haptics.notification({ type: NotificationType.Error });
      }
    } catch {
      // Ignore unsupported
    }
  };

  const getActivePinValue = () => {
    if (mode === 'setup') {
      return step === 1 ? pinNew : pinConfirm;
    }
    if (mode === 'change') {
      if (step === 1) return pinCurrent;
      if (step === 2) return pinNew;
      return pinConfirm;
    }
    // disable
    return pinCurrent;
  };

  const updateActivePinValue = (updater: (prev: string) => string) => {
    if (mode === 'setup') {
      if (step === 1) setPinNew(updater);
      else setPinConfirm(updater);
    } else if (mode === 'change') {
      if (step === 1) setPinCurrent(updater);
      else if (step === 2) setPinNew(updater);
      else setPinConfirm(updater);
    } else {
      setPinCurrent(updater);
    }
  };

  const resetAll = () => {
    setStep(1);
    setPinCurrent('');
    setPinNew('');
    setPinConfirm('');
    setErrorMsg(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleKeyPress = async (digit: string) => {
    if (isSubmitting) return;
    const currentVal = getActivePinValue();
    if (currentVal.length >= 4) return;

    triggerHaptic('tap');
    setErrorMsg(null);
    const nextVal = currentVal + digit;
    updateActivePinValue(() => nextVal);

    if (nextVal.length === 4) {
      await handleCompleteStep(nextVal);
    }
  };

  const handleDelete = () => {
    if (isSubmitting) return;
    const currentVal = getActivePinValue();
    if (currentVal.length === 0) return;

    triggerHaptic('tap');
    setErrorMsg(null);
    updateActivePinValue((prev) => prev.slice(0, -1));
  };

  const handleCompleteStep = async (entered: string) => {
    if (mode === 'setup') {
      if (step === 1) {
        // Move to confirm
        setStep(2);
      } else {
        // Confirm step
        if (entered !== pinNew) {
          triggerHaptic('error');
          setErrorMsg(t('pinMismatch'));
          setPinConfirm('');
          return;
        }
        setIsSubmitting(true);
        try {
          await setupPin(entered);
          onSuccess(t('pinSetupSuccess'));
          handleClose();
        } catch (e) {
          setErrorMsg(e instanceof Error ? e.message : 'Lỗi khi lưu mã PIN');
        } finally {
          setIsSubmitting(false);
        }
      }
    } else if (mode === 'change') {
      if (step === 1) {
        // Move to enter new PIN
        setStep(2);
      } else if (step === 2) {
        // Move to confirm new PIN
        setStep(3);
      } else {
        // Confirm step
        if (entered !== pinNew) {
          triggerHaptic('error');
          setErrorMsg(t('pinMismatch'));
          setPinConfirm('');
          return;
        }
        setIsSubmitting(true);
        try {
          const success = await changePin(pinCurrent, entered);
          if (!success) {
            triggerHaptic('error');
            setErrorMsg(t('pinIncorrect'));
            setStep(1);
            setPinCurrent('');
            setPinNew('');
            setPinConfirm('');
            return;
          }
          onSuccess(t('pinChangeSuccess'));
          handleClose();
        } catch (e) {
          setErrorMsg(e instanceof Error ? e.message : 'Lỗi khi đổi mã PIN');
        } finally {
          setIsSubmitting(false);
        }
      }
    } else if (mode === 'disable') {
      setIsSubmitting(true);
      try {
        const success = await disablePin(entered);
        if (!success) {
          triggerHaptic('error');
          setErrorMsg(t('pinIncorrect'));
          setPinCurrent('');
          return;
        }
        onSuccess(t('pinDisableSuccess'));
        handleClose();
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Lỗi khi tắt mã PIN');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Get current step instructions
  const getStepTitle = () => {
    if (mode === 'setup') {
      return step === 1 ? t('enterNewPin') : t('confirmNewPin');
    }
    if (mode === 'change') {
      if (step === 1) return t('enterCurrentPin');
      if (step === 2) return t('enterNewPin');
      return t('confirmNewPin');
    }
    return t('enterCurrentPin');
  };

  const activeValue = getActivePinValue();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              {mode === 'setup' && <ShieldCheck className="w-5 h-5" />}
              {mode === 'change' && <KeyRound className="w-5 h-5" />}
              {mode === 'disable' && <ShieldOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {mode === 'setup' && t('setupPin')}
                {mode === 'change' && t('changePin')}
                {mode === 'disable' && t('disablePin')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'setup' && `Bước ${step}/2`}
                {mode === 'change' && `Bước ${step}/3`}
                {mode === 'disable' && 'Xác thực để tắt'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Title & PIN Dots */}
        <div className="text-center space-y-3 pt-1">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {getStepTitle()}
          </p>

          <div className="flex items-center justify-center space-x-4 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = activeValue.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    isFilled
                      ? errorMsg
                        ? 'bg-rose-500 scale-125'
                        : 'bg-indigo-600 dark:bg-indigo-400 scale-125'
                      : 'border-2 border-slate-300 dark:border-slate-700 bg-transparent'
                  }`}
                />
              );
            })}
          </div>

          {/* Error Message */}
          <div className="h-5">
            {errorMsg && (
              <p className="text-[11px] font-semibold text-rose-500 flex items-center justify-center space-x-1 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 mr-1 inline" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>
        </div>

        {/* Numeric Keypad in Modal */}
        <div className="grid grid-cols-3 gap-2.5 place-items-center max-w-[260px] mx-auto pb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleKeyPress(digit)}
              className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-lg font-bold text-slate-800 dark:text-slate-100 transition shadow-2xs border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center disabled:opacity-50"
            >
              {digit}
            </button>
          ))}

          <div className="w-14 h-14" />

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleKeyPress('0')}
            className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-lg font-bold text-slate-800 dark:text-slate-100 transition shadow-2xs border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center disabled:opacity-50"
          >
            0
          </button>

          <button
            type="button"
            disabled={isSubmitting || activeValue.length === 0}
            onClick={handleDelete}
            aria-label="Xóa"
            className="w-14 h-14 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/60 active:scale-95 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition flex items-center justify-center disabled:opacity-20"
          >
            <Delete className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
};
