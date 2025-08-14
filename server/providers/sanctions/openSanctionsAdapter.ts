import fetch from 'node-fetch';
import { logger } from '../../lib/logger';

export interface OpenSanctionsSearchRequest {
  q: string;
  scope?: 'names' | 'entities';
  limit?: number;
  threshold?: number;
}

export interface OpenSanctionsMatch {
  id: string;
  caption: string;
  schema: string;
  datasets: string[];
  first_seen: string;
  last_seen: string;
  target: boolean;
  score: number;
  match?: {
    name: string;
    score: number;
  };
  properties?: {
    name?: string[];
    alias?: string[];
    nationality?: string[];
    birthDate?: string[];
    topics?: string[];
  };
}

export interface OpenSanctionsResponse {
  total: number;
  page: number;
  limit: number;
  results: OpenSanctionsMatch[];
}

export class OpenSanctionsAdapter {
  private readonly baseUrl: string;
  private readonly timeout: number = 3000; // 3s timeout as requested
  private readonly maxRetries: number = 2;
  
  constructor() {
    this.baseUrl = process.env.OPEN_SANCTIONS_BASE_URL || 'https://api.opensanctions.org';
  }

  async screenPerson(name: string, country?: string): Promise<{
    isMatch: boolean;
    riskScore: number;
    matches: OpenSanctionsMatch[];
    metadata: {
      provider: string;
      requestId: string;
      processedAt: string;
      queryNormalized: string;
      hits_count: number;
      lists: string[];
      top_matches: Array<{
        name: string;
        score: number;
        datasets: string[];
      }>;
    };
  }> {
    const startTime = Date.now();
    const requestId = `os-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Query normalization: trim, collapse spaces
    const normalizedQuery = name.trim().replace(/\s+/g, ' ');
    
    try {
      logger.info({
        component: 'opensanctions',
        action: 'screen_person',
        requestId,
        query: normalizedQuery.substring(0, 3) + '***', // Mask PII in logs
        country
      }, 'Starting OpenSanctions screening');

      const response = await this.searchWithRetry({
        q: normalizedQuery,
        limit: 25
      }, requestId);
      
      // Extract unique datasets/lists
      const allDatasets = new Set<string>();
      response.results.forEach(result => {
        result.datasets.forEach(dataset => allDatasets.add(dataset));
      });
      const lists = Array.from(allDatasets);

      // Get top 3 matches with scores
      const top_matches = response.results
        .slice(0, 3)
        .map(result => ({
          name: result.caption || result.properties?.name?.[0] || 'Unknown',
          score: Math.round(result.score * 100),
          datasets: result.datasets
        }));

      // Calculate risk score based on hits and confidence
      const riskScore = this.calculateRiskScore(response.results, normalizedQuery);
      const isMatch = riskScore > 30; // Threshold for positive match

      const duration = Date.now() - startTime;
      logger.info({
        component: 'opensanctions',
        action: 'screen_complete',
        requestId,
        hits_count: response.total,
        totalResults: response.results.length,
        riskScore,
        isMatch,
        duration,
        responseTime: duration
      }, 'OpenSanctions screening complete');

      return {
        isMatch,
        riskScore,
        matches: response.results,
        metadata: {
          provider: 'opensanctions',
          requestId,
          processedAt: new Date().toISOString(),
          queryNormalized: normalizedQuery,
          hits_count: response.total,
          lists,
          top_matches
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        component: 'opensanctions',
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        duration,
        query: normalizedQuery.substring(0, 3) + '***'
      }, 'OpenSanctions screening failed');
      
      // Return error with partial sources indicator
      throw new Error(`OpenSanctions screening failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async searchWithRetry(params: OpenSanctionsSearchRequest, requestId: string, retryCount = 0): Promise<OpenSanctionsResponse> {
    const url = new URL('/search/default', this.baseUrl);
    url.searchParams.set('q', params.q);
    if (params.scope) {
      url.searchParams.set('scope', params.scope);
    }
    url.searchParams.set('limit', (params.limit || 25).toString());
    
    try {
      logger.debug({
        component: 'opensanctions',
        requestId,
        url: url.toString(),
        retryCount
      }, 'Making OpenSanctions API request');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const headers: Record<string, string> = {
        'User-Agent': 'GCRC/1.0',
        'Accept': 'application/json'
      };

      // Add API key if provided
      const apiKey = process.env.OPEN_SANCTIONS_API_KEY;
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json() as OpenSanctionsResponse;
      
      logger.debug({
        component: 'opensanctions',
        requestId,
        statusCode: response.status,
        totalResults: result.total,
        returnedResults: result.results.length
      }, 'OpenSanctions API response received');

      return result;

    } catch (error) {
      if (retryCount < this.maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s
        logger.warn({
          component: 'opensanctions',
          requestId,
          retryCount,
          backoffDelay,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Retrying OpenSanctions request');
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.searchWithRetry(params, requestId, retryCount + 1);
      }
      
      throw error;
    }
  }

  private calculateRiskScore(results: OpenSanctionsMatch[], query: string): number {
    if (!results || results.length === 0) {
      return 0;
    }

    let maxScore = 0;
    for (const result of results) {
      let score = result.score * 100; // Convert to 0-100 scale
      
      // Boost score for target entities (those specifically sanctioned)
      if (result.target) {
        score *= 1.5;
      }
      
      // Boost for multiple datasets (cross-referenced across lists)
      if (result.datasets && result.datasets.length > 1) {
        score *= 1.2;
      }
      
      // Boost for exact name matches (higher confidence)
      if (result.match && result.match.score > 0.9) {
        score *= 1.3;
      }
      
      // Check for high-risk topics/categories
      const topics = result.properties?.topics || [];
      if (topics.some(topic => 
        topic.toLowerCase().includes('sanction') || 
        topic.toLowerCase().includes('pep') ||
        topic.toLowerCase().includes('crime')
      )) {
        score *= 1.4;
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const headers: Record<string, string> = {
        'User-Agent': 'GCRC/1.0',
        'Accept': 'application/json'
      };

      // Add API key if provided
      const apiKey = process.env.OPEN_SANCTIONS_API_KEY;
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/search/default?q=test&limit=1`, {
        method: 'GET',
        headers,
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