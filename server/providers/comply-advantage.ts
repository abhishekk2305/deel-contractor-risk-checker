import { createChildLogger } from "../lib/logger";

const logger = createChildLogger('comply-advantage');

export interface ComplyAdvantageSearchResult {
  id: string;
  name: string;
  riskLevel: 'low' | 'medium' | 'high';
  sanctions: boolean;
  pep: boolean;
  adverseMedia: boolean;
  confidence: number;
  sources: string[];
}

export interface SanctionsCheckResult {
  isSanctioned: boolean;
  isPEP: boolean;
  riskScore: number; // 0-100
  confidence: number;
  sources: string[];
  details?: any;
}

export class ComplyAdvantageProvider {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.apiKey = process.env.COMPLYADVANTAGE_API_KEY || '';
    this.baseUrl = process.env.COMPLYADVANTAGE_BASE_URL || 'https://api.complyadvantage.com';
    this.timeout = parseInt(process.env.COMPLYADVANTAGE_TIMEOUT || '5000');
  }

  async checkSanctions(
    contractorName: string, 
    countryCode: string
  ): Promise<SanctionsCheckResult> {
    const startTime = Date.now();
    
    try {
      logger.info({ 
        contractorName, 
        countryCode, 
        provider: 'complyadvantage' 
      }, 'Starting sanctions check');

      // If no API key, use mock data for development
      if (!this.apiKey) {
        logger.warn('ComplyAdvantage API key not configured, using mock data');
        return this.getMockSanctionsResult(contractorName, countryCode);
      }

      const searchPayload = {
        search_term: contractorName,
        filters: {
          types: ['sanction', 'pep', 'adverse-media'],
          birth_year: null,
          countries: [countryCode]
        },
        fuzziness: 0.6
      };

      logger.debug({ payload: searchPayload }, 'ComplyAdvantage search payload');

      const response = await fetch(`${this.baseUrl}/searches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`ComplyAdvantage API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const duration = Date.now() - startTime;
      logger.info({ 
        duration, 
        resultsCount: data.hits?.length || 0 
      }, 'ComplyAdvantage check completed');

      return this.parseComplyAdvantageResponse(data, contractorName);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn({ duration, timeout: this.timeout }, 'ComplyAdvantage request timeout');
        throw new Error('Sanctions check timeout');
      }

      logger.error({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration 
      }, 'ComplyAdvantage check failed');
      
      throw error;
    }
  }

  private parseComplyAdvantageResponse(data: any, searchTerm: string): SanctionsCheckResult {
    const hits = data.hits || [];
    
    if (hits.length === 0) {
      return {
        isSanctioned: false,
        isPEP: false,
        riskScore: 0,
        confidence: 100,
        sources: ['complyadvantage'],
        details: { searchTerm, totalHits: 0 }
      };
    }

    // Analyze hits for sanctions and PEP status
    let maxRiskScore = 0;
    let isSanctioned = false;
    let isPEP = false;
    const sources = ['complyadvantage'];

    for (const hit of hits) {
      const types = hit.types || [];
      const matchScore = hit.match_types?.[0]?.score || 0;

      if (types.includes('sanction')) {
        isSanctioned = true;
        maxRiskScore = Math.max(maxRiskScore, 85);
      }

      if (types.includes('pep')) {
        isPEP = true;
        maxRiskScore = Math.max(maxRiskScore, 60);
      }

      if (types.includes('adverse-media')) {
        maxRiskScore = Math.max(maxRiskScore, 40);
      }

      // Factor in match confidence
      maxRiskScore = Math.min(100, maxRiskScore * (matchScore / 100));
    }

    // Calculate confidence based on match quality
    const avgConfidence = hits.reduce((acc: number, hit: any) => {
      return acc + (hit.match_types?.[0]?.score || 0);
    }, 0) / hits.length;

    return {
      isSanctioned,
      isPEP,
      riskScore: Math.round(maxRiskScore),
      confidence: Math.round(avgConfidence),
      sources,
      details: {
        searchTerm,
        totalHits: hits.length,
        topMatch: hits[0]
      }
    };
  }

  private getMockSanctionsResult(contractorName: string, countryCode: string): SanctionsCheckResult {
    // Generate deterministic mock data based on name
    const nameHash = contractorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // High-risk countries get higher base scores
    const highRiskCountries = ['IR', 'KP', 'SY', 'AF'];
    const baseRisk = highRiskCountries.includes(countryCode) ? 30 : 5;
    
    // Mock some contractors as having sanctions/PEP status for testing
    const riskModifier = nameHash % 100;
    const isSanctioned = riskModifier < 5; // 5% chance
    const isPEP = riskModifier >= 5 && riskModifier < 15; // 10% chance
    
    let riskScore = baseRisk;
    if (isSanctioned) riskScore += 70;
    if (isPEP) riskScore += 40;
    
    return {
      isSanctioned,
      isPEP,
      riskScore: Math.min(100, riskScore),
      confidence: 95,
      sources: ['complyadvantage-mock'],
      details: {
        mockData: true,
        searchTerm: contractorName,
        countryCode
      }
    };
  }

  getProviderInfo() {
    return {
      name: 'ComplyAdvantage',
      type: 'sanctions-pep',
      configured: !!this.apiKey,
      baseUrl: this.baseUrl,
      timeout: this.timeout
    };
  }
}

export const complyAdvantageProvider = new ComplyAdvantageProvider();