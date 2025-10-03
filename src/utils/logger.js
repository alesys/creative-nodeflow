/**
 * Centralized logging utility with environment-aware log levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class Logger {
  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;
  }

  setLevel(level) {
    this.level = level;
  }

  error(...args) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }

  warn(...args) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  info(...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.info('[INFO]', ...args);
    }
  }

  debug(...args) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }
}

const logger = new Logger();

export default logger;
export { LOG_LEVELS };
