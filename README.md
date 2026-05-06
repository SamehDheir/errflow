# errflow

> Lightweight, zero-dependency runtime error monitoring for Node.js applications.

`errflow` silently captures exceptions and unhandled rejections, enriches them with runtime context, and ships them to your dashboard with automatic deduplication, retry logic, and zero performance overhead.

---

## Features

| Feature | Description |
|---------|-------------|
| **Auto-capture** | Listens for `uncaughtException` & `unhandledRejection` out of the box |
| **Manual capture** | `Errflow.capture(err, metadata)` anywhere in your code |
| **Smart deduplication** | Identical errors are sent only once per 60-second window |
| **Resilient transport** | 3 retries with exponential backoff (1s → 2s → 4s) |
| **Request timeout** | 5-second ceiling per request so your app never hangs |
| **Rich payloads** | Every error carries Node version, platform, arch, cwd, PID, and memory usage |
| **TypeScript-first** | Full type definitions included; strict-mode compatible |
| **Dual module** | Works with both ESM (`import`) and CommonJS (`require`) |
| **Zero-config ready** | Reads `ERRFLOW_API_KEY` from environment variables automatically |

---

## Installation

```bash
npm install errflow
```

Requires **Node.js ≥ 18**.

---

## Quick Start

### 1. Set your API key

Create a `.env` file (or export directly):

```bash
ERRFLOW_API_KEY=your_api_key_here
ERRFLOW_ENV=production
```

### 2. Initialize errflow

```typescript
import { Errflow } from 'errflow';

// One-time setup at the top of your entry file
Errflow.init({
  apiKey: process.env.ERRFLOW_API_KEY!,
  env: 'production',
});
```

### 3. Capture errors manually

```typescript
try {
  await riskyOperation();
} catch (error) {
  await Errflow.capture(error as Error, {
    userId: 'user_123',
    action: 'checkout',
  });
}
```

That's it. Unhandled exceptions and unhandled promise rejections are already being tracked automatically.

---

## Configuration

### Via code (`init`)

```typescript
Errflow.init({
  apiKey: 'live_xxxxxxxx',   // required
  env: 'staging',            // optional, defaults to 'production'
  apiUrl: 'https://custom.example.com/ingest', // optional
  disabled: false,           // optional, set true to silence all sending
});
```

### Via environment variables

If you prefer not to call `Errflow.init()`, the library will pick up the following variables automatically:

| Variable | Required | Default |
|----------|----------|---------|
| `ERRFLOW_API_KEY` | **Yes** | — |
| `ERRFLOW_ENV` | No | `production` |
| `ERRFLOW_API_URL` | No | `https://api.errflow.dev/ingest` |
| `ERRFLOW_DISABLED` | No | `false` |

> **Note:** `Errflow.init()` takes priority over environment variables. If you call it, env-vars are ignored.

---

## API Reference

### `Errflow.init(config)`

Initializes the monitoring pipeline and attaches global process listeners.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKey` | `string` | Yes | Your project API key |
| `env` | `string` | No | Environment label (`production`, `staging`, etc.) |
| `apiUrl` | `string` | No | Custom ingestion endpoint |
| `disabled` | `boolean` | No | Set `true` to disable all capture silently |

### `Errflow.capture(error, metadata?)`

Sends a single error to the ingestion endpoint.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `error` | `Error` | Yes | The error object to report |
| `metadata` | `Record<string, unknown>` | No | Any contextual data you want attached (user IDs, request paths, etc.) |

Returns a `Promise<void>`. Safe to `await` or fire-and-forget.

---

## Advanced Usage

### Disable in development or tests

```typescript
Errflow.init({
  apiKey: 'dummy',
  disabled: process.env.NODE_ENV === 'development',
});
```

When disabled, `Errflow.capture()` logs a single `[errflow] Disabled, skipping error capture` message and resolves immediately. No network request is made.

### Import only the transport layer (monitor)

If you want the raw capture logic without the high-level class wrapper, import from the `monitor` sub-path:

```typescript
import { captureError, attachGlobalListeners } from 'errflow/monitor';

attachGlobalListeners();
await captureError(new Error('Something broke'));
```

---

## Payload Schema

Every captured error is enriched with the following runtime telemetry:

```json
{
  "message": "Cannot read property 'x' of undefined",
  "stack": "TypeError: Cannot read property...",
  "environment": "production",
  "timestamp": "2024-01-15T09:32:11.742Z",
  "runtime": {
    "node": "v20.10.0",
    "platform": "linux",
    "arch": "x64",
    "cwd": "/app",
    "pid": 42,
    "memory": {
      "rss": 35651584,
      "heapTotal": 7405568,
      "heapUsed": 6374848,
      "external": 1241344,
      "arrayBuffers": 0
    }
  },
  "metadata": {
    "userId": "user_123",
    "action": "checkout"
  }
}
```

---

## How It Works

1. **Capture** — `Errflow.capture()` or global listeners intercept an error.
2. **Deduplicate** — A cache keyed by `error.message` ensures identical errors are sent at most once every **60 seconds**.
3. **Enrich** — Node.js runtime metadata is collected automatically.
4. **Send** — The payload is POSTed to the ingestion endpoint with a **5-second timeout**.
5. **Retry** — If the request fails, it retries up to **3 times** with delays of **1s, 2s, and 4s**.

The deduplication cache caps at **1,000 entries**; oldest entries are evicted first to prevent unbounded memory growth.

---

## License

MIT © [errflow](https://github.com/your-org/errflow)
