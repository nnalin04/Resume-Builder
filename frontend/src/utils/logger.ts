/**
 * Frontend logger — hierarchy-aware, level-filtered.
 *
 * Log levels (ascending severity):
 *   DEBUG — every action, state change, API call detail (dev only)
 *   INFO  — feature working, user action succeeded
 *   WARN  — recoverable issues (4xx, retries, fallbacks)
 *   ERROR — failures (5xx, unhandled exceptions)
 *
 * In production (import.meta.env.PROD), DEBUG is suppressed.
 * In development, all levels are printed.
 *
 * Usage:
 *   import { createLogger } from '../utils/logger';
 *   const log = createLogger('dashboard');
 *   log.debug('Template changed', { from: 'classic', to: 'modern' });
 *   log.info('PDF export started');
 *   log.error('Export failed', err);
 */

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LEVEL_RANK: Record<Level, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

// In production suppress DEBUG; everything else always shows
const MIN_RANK = import.meta.env.PROD ? LEVEL_RANK.INFO : LEVEL_RANK.DEBUG;

const STYLES: Record<Level, string> = {
  DEBUG: 'color:#94a3b8;font-weight:normal',
  INFO:  'color:#22c55e;font-weight:600',
  WARN:  'color:#f59e0b;font-weight:700',
  ERROR: 'color:#ef4444;font-weight:700',
};

function emit(level: Level, namespace: string, msg: string, data?: unknown): void {
  if (LEVEL_RANK[level] < MIN_RANK) return;

  const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const prefix = `%c${ts} [${level}] [${namespace}]`;

  const consoleFn =
    level === 'ERROR' ? console.error
    : level === 'WARN' ? console.warn
    : level === 'DEBUG' ? console.debug
    : console.info;

  if (data !== undefined) {
    consoleFn(`${prefix} ${msg}`, STYLES[level], data);
  } else {
    consoleFn(`${prefix} ${msg}`, STYLES[level]);
  }
}

export interface Logger {
  debug: (msg: string, data?: unknown) => void;
  info:  (msg: string, data?: unknown) => void;
  warn:  (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
}

/**
 * Create a named logger for a specific namespace.
 * Use the component/module name as the namespace.
 *
 * @example
 *   const log = createLogger('auth');
 *   const log = createLogger('dashboard.export');
 *   const log = createLogger('api.client');
 */
export function createLogger(namespace: string): Logger {
  return {
    debug: (msg, data) => emit('DEBUG', namespace, msg, data),
    info:  (msg, data) => emit('INFO',  namespace, msg, data),
    warn:  (msg, data) => emit('WARN',  namespace, msg, data),
    error: (msg, data) => emit('ERROR', namespace, msg, data),
  };
}
