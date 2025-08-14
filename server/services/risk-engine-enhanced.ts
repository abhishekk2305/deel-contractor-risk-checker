import { createChildLogger } from "../lib/logger";
import { complyAdvantageProvider, type SanctionsCheckResult } from "../providers/comply-advantage";
import { newsAPIProvider, type AdverseMediaResult } from "../providers/news-api";
import { SanctionsFactory } from '../providers/sanctions/sanctionsFactory';

const logger = createChildLogger('risk-engine-enhanced');

// Feature flags for provider selection
const FEATURE_SANCTIONS_PROVIDER = process.env.SANCTIONS_PROVIDER || 'seon'; // 'seon' | 'amlbot' | 'complyadvantage'
const FEATURE_MEDIA_PROVIDER = process.env.FEATURE_MEDIA_PROVIDER || 'mock'; // 'mock' | 'newsapi'

export interface RiskAssessmentRequest {
  contractorName: string;
  contractorEmail?: string;
  countryIso: string;
  contractorType: 'independent' | 'eor' | 'freelancer';
  registrationId?: string;
}

export interface RiskAssessmentResult {
  id: string;
  contractorId: string;
  overallScore: number;
  riskTier: 'low' | 'medium' | 'high';
  topRisks: Array<{ title: string; description: string; severity: 'low' | 'medium' | 'high' }>;
  recommendations: string[];
  penaltyRange: string;
  partialSources?: string[];
  rulesetVersion: number;
  breakdown: {
    sanctions: number;
    pep: number;
    adverseMedia: number;
    internalHistory: number;
    countryBaseline: number;
  };
  generatedAt: string;
  expiresAt: string;
  providerInfo?: {
    sanctions: any;
    adverseMedia: any;
  };
}

export class EnhancedRiskEngine {
  private config = {
    weights: {
      sanctions: 0.45,      // 45%
      pep: 0.15,           // 15% 
      adverseMedia: 0.15,   // 15%
      internalHistory: 0.15, // 15%
      countryBaseline: 0.10  // 10%
    },
    tierThresholds: {
      low: 30,
      medium: 70,
      high: 100
    }
  };

  async assessRisk(request: RiskAssessmentRequest): Promise<RiskAssessmentResult> {
    const startTime = Date.now();
    const partialSources: string[] = [];
    
    logger.info({ 
      contractorName: request.contractorName, 
      countryIso: request.countryIso, 
      contractorType: request.contractorType,
      sanctionsProvider: FEATURE_SANCTIONS_PROVIDER,
      mediaProvider: FEATURE_MEDIA_PROVIDER
    }, 'Starting enhanced risk assessment');
    
    try {
      // Run external provider checks in parallel
      const [sanctionsResult, adverseMediaResult, countryBaseline] = await Promise.allSettled([
        this.checkSanctions(request.contractorName, request.countryIso),
        this.checkAdverseMedia(request.contractorName, request.countryIso),
        this.getCountryBaseline(request.countryIso)
      ]);

      // Handle sanctions check result
      let sanctions = 0, pep = 0;
      let sanctionsInfo = null;
      if (sanctionsResult.status === 'fulfilled') {
        sanctions = sanctionsResult.value.riskScore;
        pep = sanctionsResult.value.isPEP ? 60 : 0;
        sanctionsInfo = sanctionsResult.value;
        
        logger.info({
          provider: FEATURE_SANCTIONS_PROVIDER,
          isSanctioned: sanctionsResult.value.isSanctioned,
          isPEP: sanctionsResult.value.isPEP,
          riskScore: sanctionsResult.value.riskScore,
          confidence: sanctionsResult.value.confidence
        }, 'Sanctions check completed');
      } else {
        logger.warn({ error: sanctionsResult.reason }, 'Sanctions check failed, using fallback');
        partialSources.push('sanctions-timeout');
        sanctions = this.getFallbackSanctionsScore(request.contractorName, request.countryIso);
      }

      // Handle adverse media result  
      let adverseMedia = 0;
      let mediaInfo = null;
      if (adverseMediaResult.status === 'fulfilled') {
        adverseMedia = adverseMediaResult.value.riskScore;
        mediaInfo = adverseMediaResult.value;
        
        logger.info({
          provider: FEATURE_MEDIA_PROVIDER,
          hasAdverseMedia: adverseMediaResult.value.hasAdverseMedia,
          riskScore: adverseMediaResult.value.riskScore,
          articlesFound: adverseMediaResult.value.articles?.length || 0
        }, 'Adverse media check completed');
      } else {
        logger.warn({ error: adverseMediaResult.reason }, 'Adverse media check failed, using fallback');
        partialSources.push('adverse-media-timeout');
        adverseMedia = this.getFallbackMediaScore(request.contractorName, request.countryIso);
      }

      // Handle country baseline
      let baseline = 25; // default
      if (countryBaseline.status === 'fulfilled') {
        baseline = countryBaseline.value;
      }

      // Calculate internal history score (simulated based on contractor data)
      const internalHistory = this.calculateInternalHistoryScore(request.contractorName, request.contractorType);
      
      // Calculate weighted overall score
      const overallScore = Math.round(
        sanctions * this.config.weights.sanctions +
        pep * this.config.weights.pep +
        adverseMedia * this.config.weights.adverseMedia +
        internalHistory * this.config.weights.internalHistory +
        baseline * this.config.weights.countryBaseline
      );
      
      // Determine risk tier
      let riskTier: 'low' | 'medium' | 'high';
      if (overallScore < this.config.tierThresholds.low) riskTier = 'low';
      else if (overallScore < this.config.tierThresholds.medium) riskTier = 'medium';
      else riskTier = 'high';
      
      // Generate contextual risks and recommendations
      const { topRisks, recommendations, penaltyRange } = this.generateRiskContext(
        request.countryIso,
        riskTier,
        overallScore,
        request.contractorType,
        sanctionsInfo,
        mediaInfo
      );
      
      const breakdown = {
        sanctions,
        pep,
        adverseMedia,
        internalHistory,
        countryBaseline: baseline
      };
      
      const result: RiskAssessmentResult = {
        id: crypto.randomUUID(),
        contractorId: '', // Will be set by caller
        overallScore,
        riskTier,
        topRisks,
        recommendations,
        penaltyRange,
        partialSources: partialSources.length > 0 ? partialSources : undefined,
        rulesetVersion: 1,
        breakdown,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
        providerInfo: {
          sanctions: sanctionsInfo,
          adverseMedia: mediaInfo
        }
      };
      
      const duration = Date.now() - startTime;
      logger.info({ 
        duration, 
        overallScore, 
        riskTier,
        partialSources,
        providers: {
          sanctions: FEATURE_SANCTIONS_PROVIDER,
          media: FEATURE_MEDIA_PROVIDER
        }
      }, 'Enhanced risk assessment completed');
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ 
        error: error instanceof Error ? error.message : 'Unknown error', 
        duration 
      }, 'Enhanced risk assessment failed');
      throw error;
    }
  }

  private async checkSanctions(contractorName: string, countryIso: string): Promise<SanctionsCheckResult> {
    if (FEATURE_SANCTIONS_PROVIDER === 'complyadvantage') {
      return await complyAdvantageProvider.checkSanctions(contractorName, countryIso);
    } else if (FEATURE_SANCTIONS_PROVIDER === 'seon' || FEATURE_SANCTIONS_PROVIDER === 'amlbot') {
      // Use new live sanctions providers
      try {
        const adapter = SanctionsFactory.getAdapter();
        const result = await adapter.screenPerson(contractorName, countryIso);
        
        // Convert to legacy format for compatibility
        const pepMatches = result.matches.filter(match => {
          if ('watchlist' in match) {
            return match.watchlist.includes('pep');
          } else if ('type' in match) {
            return match.type === 'pep';
          }
          return false;
        });

        const sanctionMatches = result.matches.filter(match => {
          if ('watchlist' in match) {
            return match.watchlist.includes('sanctions');
          } else if ('type' in match) {
            return match.type === 'sanction';
          }
          return false;
        });

        return {
          isSanctioned: sanctionMatches.length > 0,
          isPEP: pepMatches.length > 0,
          riskScore: result.riskScore,
          confidence: result.riskScore,
          sources: [result.metadata.provider],
          details: {
            provider: result.metadata.provider,
            requestId: result.metadata.requestId,
            totalMatches: result.matches.length,
            sanctionMatches: sanctionMatches.length,
            pepMatches: pepMatches.length,
            processedAt: result.metadata.processedAt
          }
        };
      } catch (error) {
        logger.error({
          component: 'risk-engine',
          provider: FEATURE_SANCTIONS_PROVIDER,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Live sanctions provider failed');
        
        throw error; // Don't fallback to mock per requirements
      }
    } else {
      // Use mock provider only for testing
      return this.getMockSanctionsResult(contractorName, countryIso);
    }
  }

  private async checkAdverseMedia(contractorName: string, countryIso: string): Promise<AdverseMediaResult> {
    if (FEATURE_MEDIA_PROVIDER === 'newsapi') {
      return await newsAPIProvider.checkAdverseMedia(contractorName, countryIso);
    } else {
      // Use mock provider
      return this.getMockAdverseMediaResult(contractorName, countryIso);
    }
  }

  private async getCountryBaseline(countryIso: string): Promise<number> {
    // Country risk scores based on various international indices
    const countryRiskMap: Record<string, number> = {
      'US': 15, 'GB': 12, 'CA': 10, 'AU': 8, 'DE': 14,
      'FR': 16, 'IT': 20, 'ES': 18, 'NL': 11, 'SE': 7,
      'NO': 6, 'DK': 8, 'CH': 5, 'SG': 12, 'HK': 22,
      'JP': 10, 'KR': 18, 'IN': 35, 'CN': 45, 'BR': 32,
      'MX': 28, 'AR': 30, 'CL': 25, 'RU': 55, 'TR': 40,
      'ZA': 38, 'NG': 45, 'EG': 42, 'PK': 48, 'BD': 50,
      'IR': 75, 'IQ': 80, 'AF': 85, 'SY': 90, 'KP': 95
    };
    
    return countryRiskMap[countryIso] || 25;
  }

  private getMockSanctionsResult(contractorName: string, countryIso: string): SanctionsCheckResult {
    const nameHash = this.hashString(contractorName);
    const countryHash = this.hashString(countryIso);
    
    const highRiskCountries = ['IR', 'KP', 'SY', 'AF'];
    const baseRisk = highRiskCountries.includes(countryIso) ? 30 : 5;
    
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
      sources: ['mock-sanctions'],
      details: { mockData: true, searchTerm: contractorName, countryCode: countryIso }
    };
  }

  private getMockAdverseMediaResult(contractorName: string, countryIso: string): AdverseMediaResult {
    const nameHash = this.hashString(contractorName);
    const riskModifier = nameHash % 100;
    
    const hasAdverseMedia = riskModifier < 15; // 15% chance
    let riskScore = hasAdverseMedia ? 20 + (riskModifier % 40) : 0;
    
    return {
      hasAdverseMedia,
      riskScore,
      confidence: 85,
      sources: ['mock-media'],
      articles: hasAdverseMedia ? [{
        title: `${contractorName} compliance review`,
        description: `Mock adverse media article for testing purposes`,
        url: 'https://example.com/mock-article',
        publishedAt: new Date().toISOString(),
        sentiment: 'negative' as const
      }] : []
    };
  }

  private getFallbackSanctionsScore(contractorName: string, countryIso: string): number {
    // Conservative fallback when sanctions API fails
    const highRiskCountries = ['IR', 'KP', 'SY', 'AF', 'RU'];
    return highRiskCountries.includes(countryIso) ? 40 : 10;
  }

  private getFallbackMediaScore(contractorName: string, countryIso: string): number {
    // Conservative fallback when media API fails
    return 15; // Moderate risk assumption
  }

  private calculateInternalHistoryScore(contractorName: string, contractorType: string): number {
    // Simulate internal history score based on contractor type and name hash
    const nameHash = this.hashString(contractorName);
    const baseScore = contractorType === 'independent' ? 8 : contractorType === 'eor' ? 12 : 15;
    return baseScore + (nameHash % 20);
  }

  private generateRiskContext(
    countryIso: string,
    riskTier: 'low' | 'medium' | 'high',
    overallScore: number,
    contractorType: string,
    sanctionsInfo?: any,
    mediaInfo?: any
  ) {
    const countryNames: Record<string, string> = {
      'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada',
      'AU': 'Australia', 'DE': 'Germany', 'FR': 'France'
    };

    const countryName = countryNames[countryIso] || 'Selected country';
    
    // Generate top risks based on actual provider results
    const topRisks: Array<{ title: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];
    
    if (sanctionsInfo?.isSanctioned) {
      topRisks.push({
        title: "Sanctions List Match",
        description: `Contractor appears on international sanctions lists`,
        severity: "high" as const
      });
    }
    
    if (sanctionsInfo?.isPEP) {
      topRisks.push({
        title: "Politically Exposed Person",
        description: `Contractor identified as politically exposed person`,
        severity: "medium" as const
      });
    }
    
    if (mediaInfo?.hasAdverseMedia) {
      topRisks.push({
        title: "Adverse Media Coverage",
        description: `Negative media coverage found related to contractor`,
        severity: "medium" as const
      });
    }

    // Add standard country/compliance risks
    topRisks.push({
      title: "Standard compliance requirements",
      description: `${countryName} regulatory environment requires careful compliance monitoring`,
      severity: riskTier === 'high' ? "high" as const : "medium" as const
    });

    if (riskTier === 'medium' || riskTier === 'high') {
      topRisks.push({
        title: "Cross-border payment considerations",
        description: `International payments require additional due diligence and reporting`,
        severity: "medium" as const
      });
    }

    // Trim to top 5 risks
    const finalRisks = topRisks.slice(0, 5);

    // Generate recommendations
    const recommendations = [
      "Review local employment laws and regulations",
      "Ensure proper tax compliance and withholding procedures",
      "Maintain updated contractor agreements and documentation"
    ];

    if (sanctionsInfo?.isSanctioned || sanctionsInfo?.isPEP) {
      recommendations.unshift("Conduct enhanced due diligence before engagement");
    }

    if (mediaInfo?.hasAdverseMedia) {
      recommendations.push("Monitor ongoing media coverage and reputation risks");
    }

    // Penalty ranges based on risk tier and country
    const penaltyRanges = {
      low: "$1,000 - $10,000",
      medium: "$5,000 - $50,000", 
      high: "$25,000 - $500,000"
    };

    return {
      topRisks: finalRisks,
      recommendations,
      penaltyRange: penaltyRanges[riskTier]
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Provider information methods
  getProviderStatus() {
    return {
      sanctions: {
        enabled: FEATURE_SANCTIONS_PROVIDER,
        provider: FEATURE_SANCTIONS_PROVIDER === 'complyadvantage' ? 
          complyAdvantageProvider.getProviderInfo() : 
          { name: 'Mock', configured: true }
      },
      adverseMedia: {
        enabled: FEATURE_MEDIA_PROVIDER,
        provider: FEATURE_MEDIA_PROVIDER === 'newsapi' ? 
          newsAPIProvider.getProviderInfo() : 
          { name: 'Mock', configured: true }
      }
    };
  }
}

export const enhancedRiskEngine = new EnhancedRiskEngine();