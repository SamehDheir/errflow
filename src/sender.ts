import { getConfig } from './config/env';

interface ErrorPayload {
  message: string;
  stack?: string;
  environment: string;
  timestamp: string;
  runtime: {
    node: string;
    platform: string;
    arch: string;
    cwd: string;
    pid: number;
    memory: NodeJS.MemoryUsage;
  };
  metadata?: Record<string, unknown>;
}

const TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function sendError(payload: ErrorPayload): Promise<void> {
  const config = getConfig();
  const apiUrl = config.ERRFLOW_API_URL || 'https://api.errflow.dev/ingest';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Errflow-Key': config.ERRFLOW_API_KEY,
    'User-Agent': `errflow/1.0.0 (node/${process.version})`,
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        apiUrl,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        },
        TIMEOUT_MS
      );

      if (response.ok) {
        return;
      }

      console.warn(`[errflow] Attempt ${attempt + 1} failed with status ${response.status}`);

      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    } catch (error) {
      console.warn(`[errflow] Attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : String(error));
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  console.error(`[errflow] Failed to send error after ${MAX_RETRIES} attempts`);
  throw new Error(`Failed to send error after ${MAX_RETRIES} attempts`);
}
