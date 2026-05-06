import { setConfig, isDisabled } from './config/env';
import { captureError, attachGlobalListeners } from './monitor';

export interface ErrflowConfig {
  apiKey: string;
  env?: string;
  apiUrl?: string;
  disabled?: boolean;
}

export class Errflow {
  static init(config: ErrflowConfig): void {
    setConfig(config);
    if (!config.disabled) {
      attachGlobalListeners();
    }
  }

  static async capture(error: Error, metadata?: Record<string, unknown>): Promise<void> {
    if (isDisabled()) {
      console.log('[errflow] Disabled, skipping error capture');
      return;
    }
    await captureError(error, metadata);
  }
}

// Backward compatibility
export class AutoPR extends Errflow {}
export interface AutoPRConfig extends ErrflowConfig {}
