import { RiskCheckRequest, RiskAssessmentResult } from "@shared/schema";
import { externalApis } from "./external-apis";
import { storage } from "../storage";
import { createChildLogger } from "../lib/logger";

const logger = createChildLogger('risk-engine');

interface RiskEngineConfig {
  weights: {
    sanctions: number;
    pep: number;
    adverseMedia: number;
    internalHistory: number;
    countryBaseline: number;
  };
  tierThresholds: {
    low: number;
    medium: number;
    high: number;
  };
}

const DEFAULT_CONFIG: RiskEngineConfig = {
  weights: {
    sanctions: 0.45,
    pep: 0.15,
    adverseMedia: 0.15,
    internalHistory: 0.15,
    countryBaseline: 0.10,
  },
  tierThresholds: {
    low: 33,
    medium: 67,
    high: 100,
  },
};

interface RiskAssessmentInput extends RiskCheckRequest {
  contractorId: string;
}

class RiskEngine {
  private config: RiskEngineConfig;

  constructor(config: RiskEngineConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  async assessRisk(input: RiskAssessmentInput): Promise<RiskAssessmentResult> {
    logger.info({ contractorId: input.contractorId, countryIso: input.countryIso }, 'Starting risk assessment');

    const partialSources: string[] = [];
    let breakdown = {
      sanctions: 0,
      pep: 0,
      adverseMedia: 0,
      internalHistory: 0,
      countryBaseline: 0,
    };

    try {
      // Run all risk checks in parallel
      const [
        sanctionsResult,
        pepResult,
        adverseMediaResult,
        internalHistoryResult,
        countryBaselineResult,
      ] = await Promise.allSettled([
        this.checkSanctions(input),
        this.checkPEP(input),
        this.checkAdverseMedia(input),
        this.checkInternalHistory(input),
        this.getCountryBaseline(input.countryIso),
      ]);

      // Process sanctions check
      if (sanctionsResult.status === 'fulfilled') {
        breakdown.sanctions = sanctionsResult.value;
      } else {
        logger.warn({ error: sanctionsResult.reason }, 'Sanctions check failed');
        partialSources.push('sanctions');
        breakdown.sanctions = 50; // Conservative default
      }

      // Process PEP check
      if (pepResult.status === 'fulfilled') {
        breakdown.pep = pepResult.value;
      } else {
        logger.warn({ error: pepResult.reason }, 'PEP check failed');
        partialSources.push('pep');
        breakdown.pep = 30; // Conservative default
      }

      // Process adverse media check
      if (adverseMediaResult.status === 'fulfilled') {
        breakdown.adverseMedia = adverseMediaResult.value;
      } else {
        logger.warn({ error: adverseMediaResult.reason }, 'Adverse media check failed');
        partialSources.push('adverse_media');
        breakdown.adverseMedia = 25; // Conservative default
      }

      // Process internal history check
      if (internalHistoryResult.status === 'fulfilled') {
        breakdown.internalHistory = internalHistoryResult.value;
      } else {
        logger.warn({ error: internalHistoryResult.reason }, 'Internal history check failed');
        partialSources.push('internal_history');
        breakdown.internalHistory = 20; // Conservative default
      }

      // Process country baseline
      if (countryBaselineResult.status === 'fulfilled') {
        breakdown.countryBaseline = countryBaselineResult.value;
      } else {
        logger.warn({ error: countryBaselineResult.reason }, 'Country baseline check failed');
        partialSources.push('country_baseline');
        breakdown.countryBaseline = 15; // Conservative default
      }

    } catch (error) {
      logger.error({ error }, 'Error during risk assessment');
      throw error;
    }

    // Calculate weighted score
    const score = Math.round(
      breakdown.sanctions * this.config.weights.sanctions +
      breakdown.pep * this.config.weights.pep +
      breakdown.adverseMedia * this.config.weights.adverseMedia +
      breakdown.internalHistory * this.config.weights.internalHistory +
      breakdown.countryBaseline * this.config.weights.countryBaseline
    );

    // Determine tier
    const tier = this.determineTier(score);

    // Generate recommendations and risk factors
    const { topRisks, recommendations } = await this.generateRecommendations(input, breakdown, score);

    // Get penalty range
    const penaltyRange = this.getPenaltyRange(tier);

    // Get current ruleset version
    const rulesetVersion = await this.getCurrentRulesetVersion(input.countryIso);

    const result: RiskAssessmentResult = {
      score,
      tier,
      topRisks,
      recommendations,
      penaltyRange,
      partialSources,
      rulesetVersion,
      breakdown,
    };

    logger.info({ 
      contractorId: input.contractorId, 
      score, 
      tier, 
      partialSources 
    }, 'Risk assessment completed');

    return result;
  }

  private async checkSanctions(input: RiskAssessmentInput): Promise<number> {
    try {
      const result = await externalApis.checkSanctions({
        name: input.contractorName || '',
        country: input.countryIso,
        registrationId: input.registrationId,
      });

      // Convert sanctions hits to score (0-100)
      return Math.min(result.hitsCount * 25, 100);
    } catch (error) {
      logger.error({ error }, 'Sanctions API check failed');
      throw error;
    }
  }

  private async checkPEP(input: RiskAssessmentInput): Promise<number> {
    try {
      const result = await externalApis.checkPEP({
        name: input.contractorName || '',
        country: input.countryIso,
      });

      // Convert PEP status to score
      return result.isPEP ? 80 : 10;
    } catch (error) {
      logger.error({ error }, 'PEP API check failed');
      throw error;
    }
  }

  private async checkAdverseMedia(input: RiskAssessmentInput): Promise<number> {
    try {
      const result = await externalApis.checkAdverseMedia({
        name: input.contractorName || '',
        country: input.countryIso,
      });

      // Convert mentions to score
      return Math.min(result.mentionsCount * 10, 100);
    } catch (error) {
      logger.error({ error }, 'Adverse media API check failed');
      throw error;
    }
  }

  private async checkInternalHistory(input: RiskAssessmentInput): Promise<number> {
    try {
      const history = await storage.getContractorHistory(
        input.contractorName || '',
        input.countryIso
      );

      if (history.length === 0) return 0;

      // Calculate score based on historical risk scores
      const avgHistoricalScore = history.reduce((sum, h) => sum + h.score, 0) / history.length;
      return Math.round(avgHistoricalScore * 0.5); // Reduce weight for historical data
    } catch (error) {
      logger.error({ error }, 'Internal history check failed');
      throw error;
    }
  }

  private async getCountryBaseline(countryIso: string): Promise<number> {
    try {
      const country = await storage.getCountryByIso(countryIso);
      if (!country) return 50; // Default moderate risk

      // Get country-specific baseline risk from compliance rules
      const rules = await storage.getComplianceRules({ 
        countryIso, 
        status: 'published' 
      });

      if (rules.length === 0) return 30; // Low risk if no specific rules

      // Calculate baseline from rule severities
      const avgSeverity = rules.reduce((sum, rule) => sum + rule.severity, 0) / rules.length;
      return Math.round(avgSeverity * 10); // Convert 1-10 scale to 0-100
    } catch (error) {
      logger.error({ error }, 'Country baseline check failed');
      throw error;
    }
  }

  private determineTier(score: number): 'low' | 'medium' | 'high' {
    if (score < this.config.tierThresholds.low) return 'low';
    if (score < this.config.tierThresholds.medium) return 'medium';
    return 'high';
  }

  private async generateRecommendations(
    input: RiskAssessmentInput, 
    breakdown: any, 
    score: number
  ): Promise<{ 
    topRisks: Array<{ title: string; description: string; severity: 'low' | 'medium' | 'high' }>; 
    recommendations: string[] 
  }> {
    const topRisks = [];
    const recommendations = [];

    // Identify top risk factors
    const riskFactors = [
      { name: 'Sanctions', score: breakdown.sanctions },
      { name: 'PEP', score: breakdown.pep },
      { name: 'Adverse Media', score: breakdown.adverseMedia },
      { name: 'Internal History', score: breakdown.internalHistory },
      { name: 'Country Baseline', score: breakdown.countryBaseline },
    ].sort((a, b) => b.score - a.score);

    // Generate risk factors
    for (const factor of riskFactors.slice(0, 3)) {
      if (factor.score > 20) {
        topRisks.push({
          title: `${factor.name} Risk`,
          description: this.getRiskDescription(factor.name, factor.score),
          severity: factor.score > 60 ? 'high' : factor.score > 30 ? 'medium' : 'low',
        });
      }
    }

    // Generate recommendations based on risk factors
    if (breakdown.sanctions > 30) {
      recommendations.push('Conduct enhanced due diligence and sanctions screening');
    }
    if (breakdown.pep > 30) {
      recommendations.push('Implement PEP monitoring and reporting procedures');
    }
    if (breakdown.adverseMedia > 30) {
      recommendations.push('Monitor adverse media mentions and establish reputational risk controls');
    }
    if (breakdown.internalHistory > 30) {
      recommendations.push('Review previous compliance issues and implement corrective measures');
    }
    if (breakdown.countryBaseline > 40) {
      recommendations.push('Apply country-specific compliance requirements and enhanced monitoring');
    }

    // Add general recommendations based on overall score
    if (score > 50) {
      recommendations.push('Consider increased oversight and regular compliance reviews');
    }
    
    return { topRisks, recommendations };
  }

  private getRiskDescription(factorName: string, score: number): string {
    const descriptions = {
      'Sanctions': 'Potential sanctions list matches requiring investigation and verification',
      'PEP': 'Politically Exposed Person status requiring enhanced due diligence',
      'Adverse Media': 'Negative media coverage indicating potential reputational risks',
      'Internal History': 'Previous compliance issues or risk factors in our records',
      'Country Baseline': 'Country-specific regulatory and compliance risks',
    };

    return descriptions[factorName as keyof typeof descriptions] || 'Risk factor requiring attention';
  }

  private getPenaltyRange(tier: 'low' | 'medium' | 'high'): string {
    const ranges = {
      low: '$500 - $2,500 in potential fines for minor compliance issues',
      medium: '$2,500 - $25,000 in potential fines for moderate compliance violations',
      high: '$25,000 - $500,000+ in potential fines for serious compliance violations',
    };

    return ranges[tier];
  }

  private async getCurrentRulesetVersion(countryIso: string): Promise<number> {
    try {
      const version = await storage.getCurrentRulesetVersion(countryIso);
      return version || 1;
    } catch (error) {
      logger.warn({ error, countryIso }, 'Failed to get ruleset version');
      return 1;
    }
  }
}

export const riskEngine = new RiskEngine();
