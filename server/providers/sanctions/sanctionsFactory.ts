import { SeonSanctionsAdapter } from './seonAdapter';
import { AmlbotSanctionsAdapter } from './amlbotAdapter';
import { logger } from '../../lib/logger';

export type SanctionsProvider = 'seon' | 'amlbot';

export interface SanctionsResult {
  isMatch: boolean;
  riskScore: number;
  matches: any[];
  metadata: {
    provider: string;
    requestId: string;
    processedAt: string;
    [key: string]: any;
  };
}

export interface SanctionsAdapter {
  screenPerson(name: string, country?: string): Promise<SanctionsResult>;
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    error?: string;
  }>;
}

export class SanctionsFactory {
  private static instance: SanctionsAdapter | null = null;
  private static currentProvider: SanctionsProvider | null = null;

  static getAdapter(): SanctionsAdapter {
    const provider = this.getProviderFromEnv();
    
    // Return existing instance if provider hasn't changed
    if (this.instance && this.currentProvider === provider) {
      return this.instance;
    }

    // Create new adapter instance
    this.currentProvider = provider;
    
    switch (provider) {
      case 'seon':
        this.instance = new SeonSanctionsAdapter();
        break;
      case 'amlbot':
        this.instance = new AmlbotSanctionsAdapter();
        break;
      default:
        throw new Error(`Unsupported sanctions provider: ${provider}`);
    }

    logger.info({
      component: 'sanctions-factory',
      provider,
      action: 'adapter_created'
    }, `Initialized ${provider} sanctions adapter`);

    return this.instance;
  }

  static getProviderFromEnv(): SanctionsProvider {
    const provider = process.env.SANCTIONS_PROVIDER?.toLowerCase() as SanctionsProvider;
    
    if (!provider) {
      throw new Error('SANCTIONS_PROVIDER environment variable is required (seon|amlbot)');
    }

    if (!['seon', 'amlbot'].includes(provider)) {
      throw new Error(`Invalid SANCTIONS_PROVIDER: ${provider}. Must be 'seon' or 'amlbot'`);
    }

    return provider;
  }

  static getCurrentProvider(): SanctionsProvider | null {
    return this.currentProvider;
  }

  static async healthCheck(): Promise<{
    provider: SanctionsProvider;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    error?: string;
  }> {
    try {
      const provider = this.getProviderFromEnv();
      const adapter = this.getAdapter();
      const health = await adapter.healthCheck();
      
      return {
        provider,
        ...health
      };
    } catch (error) {
      const provider = this.getCurrentProvider() || 'unknown';
      return {
        provider: provider as SanctionsProvider,
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}