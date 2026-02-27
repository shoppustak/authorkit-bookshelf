/**
 * Logger utility for environment-aware logging
 * Reduces excessive logging in production while preserving important error logs
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Format log message with timestamp and level
 */
function formatMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  if (data) {
    return `${prefix} ${message}`;
  }

  return `${prefix} ${message}`;
}

/**
 * Logger class
 */
class Logger {
  /**
   * Log error messages (always logged, even in production)
   */
  error(message, error = null) {
    if (error) {
      console.error(formatMessage(LOG_LEVELS.ERROR, message), error);
    } else {
      console.error(formatMessage(LOG_LEVELS.ERROR, message));
    }
  }

  /**
   * Log warning messages (only in development)
   */
  warn(message, data = null) {
    if (!isProduction) {
      if (data) {
        console.warn(formatMessage(LOG_LEVELS.WARN, message), data);
      } else {
        console.warn(formatMessage(LOG_LEVELS.WARN, message));
      }
    }
  }

  /**
   * Log info messages (only in development)
   */
  info(message, data = null) {
    if (!isProduction) {
      if (data) {
        console.log(formatMessage(LOG_LEVELS.INFO, message), data);
      } else {
        console.log(formatMessage(LOG_LEVELS.INFO, message));
      }
    }
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message, data = null) {
    if (isDevelopment) {
      if (data) {
        console.log(formatMessage(LOG_LEVELS.DEBUG, message), data);
      } else {
        console.log(formatMessage(LOG_LEVELS.DEBUG, message));
      }
    }
  }

  /**
   * Log security events (always logged)
   */
  security(event, data = null) {
    const message = `[SECURITY] ${event}`;
    if (data) {
      console.log(formatMessage(LOG_LEVELS.WARN, message), JSON.stringify(data));
    } else {
      console.log(formatMessage(LOG_LEVELS.WARN, message));
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export logger as default
export default logger;
