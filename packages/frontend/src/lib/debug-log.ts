const DEBUG_STORAGE_KEY = 'opsui:debug-logs';

const isDebugLoggingEnabled = () => {
  if (import.meta.env.DEV) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
};

export const debugLog = (...args: unknown[]) => {
  if (isDebugLoggingEnabled()) {
    console.log(...args);
  }
};

export const debugWarn = (...args: unknown[]) => {
  if (isDebugLoggingEnabled()) {
    console.warn(...args);
  }
};

export const debugError = (...args: unknown[]) => {
  if (isDebugLoggingEnabled()) {
    console.error(...args);
  }
};

export { DEBUG_STORAGE_KEY };
