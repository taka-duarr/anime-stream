// ============================================
// LOGGER UTILITY
// Memusatkan semua output log dan secara otomatis
// menonaktifkannya di lingkungan production.
// ============================================

const IS_DEV = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (IS_DEV) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (IS_DEV) console.warn(...args);
  },
  error: (...args: any[]) => {
    if (IS_DEV) console.error(...args);
  },
  info: (...args: any[]) => {
    if (IS_DEV) console.info(...args);
  },
  debug: (...args: any[]) => {
    if (IS_DEV) console.debug(...args);
  },
};
