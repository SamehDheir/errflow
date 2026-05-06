# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added
- Initial release of `errflow`
- `Errflow.init(config)` for programmatic initialization
- `Errflow.capture(error, metadata?)` for manual error reporting
- Automatic global listeners for `uncaughtException` and `unhandledRejection`
- Smart deduplication: identical errors throttled to once per 60 seconds
- Exponential retry backoff (1s → 2s → 4s) with up to 3 attempts
- 5-second request timeout per ingestion attempt
- Rich runtime payload including Node version, platform, arch, cwd, PID, and memory usage
- TypeScript-first with full type definitions
- Dual ESM / CommonJS builds via `tsup`
- Environment variable support (`ERRFLOW_API_KEY`, `ERRFLOW_ENV`, `ERRFLOW_API_URL`, `ERRFLOW_DISABLED`)
- Optional `disabled` flag for development / test silencing
- `monitor` sub-path export for low-level transport usage

## [1.0.0] - 2024-01-15

- First stable release.
