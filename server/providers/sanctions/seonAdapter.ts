import fetch from 'node-fetch';
import { logger } from '../../lib/logger';

export interface SeonSanctionsRequest {
  query: string;
  type: 'person' | 'entity';
  fuzzy_matching?: boolean;
  include_watchlists?: string[];
}

export interface SeonSanctionsMatch {
  id: string;
  name: string;
  match_strength: number;
  watchlist: string;
  categories: string[];
  countries: string[];
  birth_date?: string;
  aliases?: string[];
  details?: {
    description?: string;
    listed_on?: string;
    source?: string;
  };
}

export interface SeonSanctionsResponse {
  request_id: string;
  status: 'success' | 'error';
  data: {
    matches: SeonSanctionsMatch[];
    total_matches: number;
    query_processed: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export class SeonSanctionsAdapter {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly timeout: number = 10000;
  private readonly maxRetries: number = 3;
  
  constructor() {
    this.apiKey = process.env.SEON_API_KEY || '';
    this.apiUrl = process.env.SEON_API_URL || 'https://api.seon.io';
    
    if (!this.apiKey) {
      throw new Error('SEON_API_KEY environment variable is required');
    }
  }

  async screenPerson(name: string, country?: string): Promise<{
    isMatch: boolean;
    riskScore: number;
    matches: SeonSanctionsMatch[];
    metadata: {
      provider: string;
      requestId: string;
      processedAt: string;
      queryProcessed: string;
    };
  }> {
    const startTime = Date.now();
    
    try {
      logger.info({
        component: 'seon-sanctions',
        action: 'screen_person',
        name: name.substring(0, 3) + '***', // Mask PII in logs
        country
      }, 'Starting SEON sanctions screening');

      const request: SeonSanctionsRequest = {
        query: name,
        type: 'person',
        fuzzy_matching: true,
        include_watchlists: [
          'sanctions',
          'pep',
          'adverse_media',
          'law_enforcement'
        ]
      };

      const response = await this.makeRequest('/v1/sanctions/screen', request);
      
      const riskScore = this.calculateRiskScore(response.data.matches);
      const isMatch = riskScore > 30; // Threshold for positive match

      logger.info({
        component: 'seon-sanctions',
        action: 'screen_complete',
        requestId: response.request_id,
        totalMatches: response.data.total_matches,
        riskScore,
        isMatch,
        duration: Date.now() - startTime
      }, 'SEON sanctions screening complete');

      return {
        isMatch,
        riskScore,
        matches: response.data.matches,
        metadata: {
          provider: 'seon',
          requestId: response.request_id,
          processedAt: new Date().toISOString(),
          queryProcessed: response.data.query_processed
        }
      };

    } catch (error) {
      logger.error({
        component: 'seon-sanctions',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }, 'SEON sanctions screening failed');
      
      throw new Error(`SEON sanctions screening failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async makeRequest(endpoint: string, data: any, retryCount = 0): Promise<SeonSanctionsResponse> {
    const url = `${this.apiUrl}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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

      const result = await response.json() as SeonSanctionsResponse;
      
      if (result.status === 'error') {
        throw new Error(`SEON API error: ${result.error?.message || 'Unknown error'}`);
      }

      return result;

    } catch (error) {
      if (retryCount < this.maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        logger.warn({
          component: 'seon-sanctions',
          retryCount,
          backoffDelay,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Retrying SEON request');
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.makeRequest(endpoint, data, retryCount + 1);
      }
      
      throw error;
    }
  }

  private calculateRiskScore(matches: SeonSanctionsMatch[]): number {
    if (!matches || matches.length === 0) {
      return 0;
    }

    let maxScore = 0;
    for (const match of matches) {
      let score = match.match_strength * 100;
      
      // Boost score based on watchlist severity
      if (match.watchlist.includes('sanctions')) {
        score *= 1.5;
      }
      if (match.watchlist.includes('pep')) {
        score *= 1.2;
      }
      if (match.watchlist.includes('law_enforcement')) {
        score *= 1.4;
      }
      
      // Boost for multiple categories
      if (match.categories && match.categories.length > 1) {
        score *= 1.1;
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
      // Simple health check with minimal query
      await this.makeRequest('/v1/health', {});
      
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