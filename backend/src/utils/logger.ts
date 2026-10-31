type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const timestamp = formatTimestamp();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${timestamp}] [${level}] ${message}${metaStr}`;

  switch (level) {
    case 'ERROR':
      console.error(line);
      break;
    case 'WARN':
      console.warn(line);
      break;
    case 'DEBUG':
      if (process.env.NODE_ENV === 'development') {
        console.debug(line);
      }
      break;
    default:
      console.log(line);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log('INFO', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('WARN', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('ERROR', message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log('DEBUG', message, meta),
};
