import { settingsRepository } from '@/repositories/settingsRepository';

const SETTING_KEY_PIN_ENABLED = 'security_pin_enabled';
const SETTING_KEY_PIN_HASH = 'security_pin_hash';
const SETTING_KEY_PIN_SALT = 'security_pin_salt';

function generateRandomSalt(length = 16): string {
  const array = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pin}:sono_secure_pin_salt_v1`);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Basic deterministic fallback if crypto.subtle is unavailable
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data[i];
    hash |= 0;
  }
  return `fallback_${Math.abs(hash)}`;
}

export const pinService = {
  /**
   * Check whether PIN lock is enabled in settings
   */
  async isPinEnabled(): Promise<boolean> {
    try {
      const enabled = await settingsRepository.get(SETTING_KEY_PIN_ENABLED, 'false');
      const hash = await settingsRepository.get(SETTING_KEY_PIN_HASH, '');
      return enabled === 'true' && hash.length > 0;
    } catch (e) {
      console.warn('[PinService] Error checking PIN status:', e);
      return false;
    }
  },

  /**
   * Verify input PIN against stored salted SHA-256 hash
   */
  async verifyPin(pin: string): Promise<boolean> {
    try {
      const salt = await settingsRepository.get(SETTING_KEY_PIN_SALT, '');
      const storedHash = await settingsRepository.get(SETTING_KEY_PIN_HASH, '');
      if (!salt || !storedHash) return false;
      const computedHash = await hashPin(pin, salt);
      return computedHash === storedHash;
    } catch (e) {
      console.error('[PinService] Error verifying PIN:', e);
      return false;
    }
  },

  /**
   * Save a new 4-digit PIN with random salt
   */
  async setPin(pin: string): Promise<void> {
    const salt = generateRandomSalt(16);
    const hash = await hashPin(pin, salt);
    await settingsRepository.set(SETTING_KEY_PIN_SALT, salt);
    await settingsRepository.set(SETTING_KEY_PIN_HASH, hash);
    await settingsRepository.set(SETTING_KEY_PIN_ENABLED, 'true');
  },

  /**
   * Disable PIN lock and wipe saved hash & salt
   */
  async disablePin(): Promise<void> {
    await settingsRepository.set(SETTING_KEY_PIN_ENABLED, 'false');
    await settingsRepository.set(SETTING_KEY_PIN_HASH, '');
    await settingsRepository.set(SETTING_KEY_PIN_SALT, '');
  },
};

