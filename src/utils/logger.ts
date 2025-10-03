/**
 * Centralized logging utility with environment-aware log levels
 */

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = process.env.NODE_ENV === 'production'
      ? LogLevel.WARN
      : LogLevel.DEBUG;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  error(...args: unknown[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.level >= LogLevel.INFO) {
      console.info('[INFO]', ...args);
    }
  }

  debug(...args: unknown[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }
}

const logger = new Logger();

export default logger;
export { LogLevel };

// For backwards compatibility, export LOG_LEVELS object
export const LOG_LEVELS = {
  ERROR: LogLevel.ERROR,
  WARN: LogLevel.WARN,
  INFO: LogLevel.INFO,
  DEBUG: LogLevel.DEBUG,
} as const;
