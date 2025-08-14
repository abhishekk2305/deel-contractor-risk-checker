import fetch from 'node-fetch';
import { logger } from '../../lib/logger';

export interface AmlbotSanctionsRequest {
  name: string;
  birth_year?: number;
  country?: string;
  fuzzy?: boolean;
  threshold?: number;
}

export interface AmlbotMatch {
  id: string;
  name: string;
  score: number;
  type: 'sanction' | 'pep' | 'adverse_media';
  lists: string[];
  countries: string[];
  birth_year?: number;
  description?: string;
  source_url?: string;
  last_updated?: string;
}

export interface AmlbotSanctionsResponse {
  status: 'success' | 'error';
  request_id: string;
  results: {
    matches: AmlbotMatch[];
    total: number;
    query: string;
    processing_time_ms: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export class AmlbotSanctionsAdapter {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly timeout: number = 10000;
  private readonly maxRetries: number = 3;
  
  constructor() {
    this.apiKey = process.env.AMLBOT_API_KEY || '';
    this.apiUrl = process.env.AMLBOT_API_URL || 'https://api.amlbot.com';
    
    if (!this.apiKey) {
      throw new Error('AMLBOT_API_KEY environment variable is required');
    }
  }

  async screenPerson(name: string, country?: string): Promise<{
    isMatch: boolean;
    riskScore: number;
    matches: AmlbotMatch[];
    metadata: {
      provider: string;
      requestId: string;
      processedAt: string;
      processingTimeMs: number;
    };
  }> {
    const startTime = Date.now();
    
    try {
      logger.info({
        component: 'amlbot-sanctions',
        action: 'screen_person',
        name: name.substring(0, 3) + '***', // Mask PII in logs
        country
      }, 'Starting AMLBot sanctions screening');

      const request: AmlbotSanctionsRequest = {
        name,
        country,
        fuzzy: true,
        threshold: 0.7
      };

      const response = await this.makeRequest('/api/v2/screen', request);
      
      const riskScore = this.calculateRiskScore(response.results.matches);
      const isMatch = riskScore > 30; // Threshold for positive match

      logger.info({
        component: 'amlbot-sanctions',
        action: 'screen_complete',
        requestId: response.request_id,
        totalMatches: response.results.total,
        riskScore,
        isMatch,
        duration: Date.now() - startTime
      }, 'AMLBot sanctions screening complete');

      return {
        isMatch,
        riskScore,
        matches: response.results.matches,
        metadata: {
          provider: 'amlbot',
          requestId: response.request_id,
          processedAt: new Date().toISOString(),
          processingTimeMs: response.results.processing_time_ms
        }
      };

    } catch (error) {
      logger.error({
        component: 'amlbot-sanctions',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }, 'AMLBot sanctions screening failed');
      
      throw new Error(`AMLBot sanctions screening failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async makeRequest(endpoint: string, data: any, retryCount = 0): Promise<AmlbotSanctionsResponse> {
    const url = `${this.apiUrl}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'GCRC/1.0'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json() as AmlbotSanctionsResponse;
      
      if (result.status === 'error') {
        throw new Error(`AMLBot API error: ${result.error?.message || 'Unknown error'}`);
      }

      return result;

    } catch (error) {
      if (retryCount < this.maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        logger.warn({
          component: 'amlbot-sanctions',
          retryCount,
          backoffDelay,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Retrying AMLBot request');
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.makeRequest(endpoint, data, retryCount + 1);
      }
      
      throw error;
    }
  }

  private calculateRiskScore(matches: AmlbotMatch[]): number {
    if (!matches || matches.length === 0) {
      return 0;
    }

    let maxScore = 0;
    for (const match of matches) {
      let score = match.score * 100;
      
      // Boost score based on match type severity
      if (match.type === 'sanction') {
        score *= 1.5;
      }
      if (match.type === 'pep') {
        score *= 1.2;
      }
      if (match.type === 'adverse_media') {
        score *= 1.1;
      }
      
      // Boost for multiple lists
      if (match.lists && match.lists.length > 1) {
        score *= 1.15;
      }
      
      maxScore = Math.max(maxScore, score);
    }

    return Math.min(Math.round(maxScore), 100);
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Simple health check with status endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.apiUrl}/api/v2/status`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
          'User-Agent': 'GCRC/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}