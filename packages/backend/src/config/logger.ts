import pino from 'pino'

/**
 * Log level from environment, defaults to 'info'
 */
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'

/**
 * Determine if we're in development mode
 */
const isDevelopment = process.env.NODE_ENV !== 'production'

/**
 * Base logger configuration
 */
const baseConfig: pino.LoggerOptions = {
  level: LOG_LEVEL,
  // Include service name in all logs
  base: {
    service: 'nanomail-backend',
  },
  // Use stdSerializers for error objects
  // Support both 'err' and 'error' keys for flexibility
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  // Timestamp in ISO format
  timestamp: pino.stdTimeFunctions.isoTime,
}

/**
 * Development transport for pretty printing
 */
const devTransport: pino.TransportSingleOptions = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
}

/**
 * Create the root logger
 * - Development: pretty-printed to stdout
 * - Production: JSON to stdout
 */
export const logger = isDevelopment
  ? pino({
      ...baseConfig,
      transport: devTransport,
    })
  : pino(baseConfig)

/**
 * Create a child logger for a specific module
 * @param module - Module name for log context
 * @returns Child logger with module context
 */
export function createLogger(module: string): pino.Logger {
  return logger.child({ module })
}

/**
 * Type export for dependency injection
 */
export type Logger = pino.Logger