// Risk assessment adapter interface for external data sources
export interface RiskAdapter {
  name: string;
  checkSanctions(contractorName: string, country: string): Promise<SanctionsResult>;
  checkPEP(contractorName: string, country: string): Promise<PEPResult>;
  checkAdverseMedia(contractorName: string, country: string): Promise<AdverseMediaResult>;
}

export interface SanctionsResult {
  isListed: boolean;
  confidence: number;
  sources: string[];
  details?: {
    listName: string;
    reason: string;
    dateAdded: string;
  }[];
}

export interface PEPResult {
  isPEP: boolean;
  confidence: number;
  positions: {
    title: string;
    organization: string;
    country: string;
    dateFrom: string;
    dateTo?: string;
  }[];
}

export interface AdverseMediaResult {
  riskScore: number; // 0-100
  confidence: number;
  articles: {
    title: string;
    source: string;
    date: string;
    severity: 'low' | 'medium' | 'high';
    summary: string;
  }[];
}

// Mock implementation for demonstration
export class MockRiskAdapter implements RiskAdapter {
  name = "Mock Risk Adapter";

  async checkSanctions(contractorName: string, country: string): Promise<SanctionsResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return deterministic results based on name for testing
    const isHighRisk = contractorName.toLowerCase().includes('sanction') || 
                       contractorName.toLowerCase().includes('embargo');
    
    return {
      isListed: isHighRisk,
      confidence: isHighRisk ? 95 : 98,
      sources: isHighRisk ? ['OFAC SDN', 'EU Sanctions List'] : ['OFAC SDN', 'UN Sanctions'],
      details: isHighRisk ? [{
        listName: "OFAC Specially Designated Nationals",
        reason: "Financial sanctions violation",
        dateAdded: "2023-06-15"
      }] : undefined
    };
  }

  async checkPEP(contractorName: string, country: string): Promise<PEPResult> {
    await new Promise(resolve => setTimeout(resolve, 120));
    
    const isPolitical = contractorName.toLowerCase().includes('minister') ||
                       contractorName.toLowerCase().includes('senator') ||
                       contractorName.toLowerCase().includes('mayor');
    
    return {
      isPEP: isPolitical,
      confidence: isPolitical ? 92 : 97,
      positions: isPolitical ? [{
        title: "Deputy Minister",
        organization: `${country} Ministry of Finance`,
        country: country,
        dateFrom: "2021-01-15",
        dateTo: "2023-12-31"
      }] : []
    };
  }

  async checkAdverseMedia(contractorName: string, country: string): Promise<AdverseMediaResult> {
    await new Promise(resolve => setTimeout(resolve, 80));
    
    const hasNegativeMedia = contractorName.toLowerCase().includes('fraud') ||
                            contractorName.toLowerCase().includes('corruption');
    
    const riskScore = hasNegativeMedia ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 30) + 5;
    
    return {
      riskScore,
      confidence: hasNegativeMedia ? 85 : 92,
      articles: hasNegativeMedia ? [{
        title: "Investigation into Financial Irregularities",
        source: "Financial Times",
        date: "2024-01-20",
        severity: 'high' as const,
        summary: "Regulatory investigation into alleged financial misconduct"
      }, {
        title: "Business Partnership Scrutiny",
        source: "Reuters",
        date: "2024-02-05",
        severity: 'medium' as const,
        summary: "Questions raised about business relationships and compliance"
      }] : []
    };
  }
}

// ComplyAdvantage adapter (would use real API in production)
export class ComplyAdvantageAdapter implements RiskAdapter {
  name = "ComplyAdvantage";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.COMPLY_ADVANTAGE_API_KEY || '';
  }

  async checkSanctions(contractorName: string, country: string): Promise<SanctionsResult> {
    if (!this.apiKey) {
      // Fall back to mock data when no API key
      const mockAdapter = new MockRiskAdapter();
      return mockAdapter.checkSanctions(contractorName, country);
    }

    try {
      // Real implementation would call ComplyAdvantage API
      // For now, return mock data
      return {
        isListed: false,
        confidence: 98,
        sources: ['OFAC', 'EU', 'UN'],
        details: []
      };
    } catch (error) {
      throw new Error(`ComplyAdvantage sanctions check failed: ${error}`);
    }
  }

  async checkPEP(contractorName: string, country: string): Promise<PEPResult> {
    if (!this.apiKey) {
      const mockAdapter = new MockRiskAdapter();
      return mockAdapter.checkPEP(contractorName, country);
    }

    return {
      isPEP: false,
      confidence: 97,
      positions: []
    };
  }

  async checkAdverseMedia(contractorName: string, country: string): Promise<AdverseMediaResult> {
    if (!this.apiKey) {
      const mockAdapter = new MockRiskAdapter();
      return mockAdapter.checkAdverseMedia(contractorName, country);
    }

    return {
      riskScore: 15,
      confidence: 94,
      articles: []
    };
  }
}

// Factory for creating the appropriate adapter
export function createRiskAdapter(): RiskAdapter {
  const useRealApis = process.env.NODE_ENV === 'production' && process.env.COMPLY_ADVANTAGE_API_KEY;
  
  if (useRealApis) {
    return new ComplyAdvantageAdapter();
  } else {
    return new MockRiskAdapter();
  }
}