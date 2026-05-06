import { sendError } from './sender';
import { getConfig, isDisabled } from './config/env';

const DEBOUNCE_MS = 60000;
const MAX_CACHE_SIZE = 1000;
const errorCache = new Map<string, number>();

function getCacheKey(error: Error): string {
  return error.message || 'unknown';
}

function shouldSendError(error: Error): boolean {
  const key = getCacheKey(error);
  const now = Date.now();
  const lastSent = errorCache.get(key);

  if (lastSent && now - lastSent < DEBOUNCE_MS) {
    return false;
  }

  // Prevent cache from growing too large
  if (errorCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = errorCache.keys().next().value;
    if (oldestKey) {
      errorCache.delete(oldestKey);
    }
  }

  errorCache.set(key, now);
  return true;
}

function buildPayload(error: Error, metadata?: Record<string, unknown>) {
  const config = getConfig();

  return {
    message: error.message,
    stack: error.stack,
    environment: config.ERRFLOW_ENV,
    timestamp: new Date().toISOString(),
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      pid: process.pid,
      memory: process.memoryUsage(),
    },
    metadata,
  };
}

export async function captureError(error: Error, metadata?: Record<string, unknown>): Promise<void> {
  if (isDisabled()) {
    console.log('[errflow] Disabled, skipping error capture');
    return;
  }

  if (!shouldSendError(error)) {
    return;
  }

  console.log('[errflow] Error captured:', error.message);

  try {
    const payload = buildPayload(error, metadata);
    await sendError(payload);
    console.log('[errflow] Sent successfully');
  } catch (err) {
    console.error('[errflow] Failed to send:', err instanceof Error ? err.message : String(err));
  }
}

export function attachGlobalListeners(): void {
  process.on('uncaughtException', (error: Error) => {
    console.error('[errflow] Uncaught exception:', error.message);
    captureError(error).catch(() => {});
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    console.error('[errflow] Unhandled rejection:', error.message);
    captureError(error).catch(() => {});
  });
}

attachGlobalListeners();
