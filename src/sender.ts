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

const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [3000, 6000, 12000];

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

  let lastError: string = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        apiUrl,
        { method: 'POST', headers, body: JSON.stringify(payload) },
        TIMEOUT_MS,
      );

      if (response.ok) {
        console.log(`[errflow] Sent successfully on attempt ${attempt + 1}`);
        return; 
      }

      lastError = `status ${response.status}`;
      console.warn(`[errflow] Attempt ${attempt + 1} failed with ${lastError}`);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn(`[errflow] Attempt ${attempt + 1} failed:`, lastError);
    }

    if (attempt < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAYS[attempt]);
    }
  }

  throw new Error(`Failed to send error after ${MAX_RETRIES} attempts: ${lastError}`);
}
