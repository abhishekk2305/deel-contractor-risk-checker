import { createChildLogger } from "../lib/logger";
import { createRiskAdapter, type RiskAdapter, type SanctionsResult, type PEPResult, type AdverseMediaResult } from "../adapters/risk-adapter";
import { redis } from "../lib/redis";
import { db } from "../lib/database";
import { contractors, riskScores, countries } from "@shared/schema";
import { eq } from "drizzle-orm";

const logger = createChildLogger('risk-engine');

export interface RiskCheckRequest {
  contractorName: string;
  contractorEmail?: string;
  countryIso: string;
  contractorType: 'employee' | 'contractor' | 'freelancer';
  idempotencyKey?: string;
}

export interface RiskAssessmentResult {
  id: string;
  contractorId: string;
  overallScore: number;
  riskTier: 'low' | 'medium' | 'high';
  topRisks: string[];
  recommendations: string[];
  penaltyRange: {
    min: number;
    max: number;
    currency: string;
  };
  sourceResults: {
    sanctions: SanctionsResult & { success: boolean; error?: string };
    pep: PEPResult & { success: boolean; error?: string };
    adverseMedia: AdverseMediaResult & { success: boolean; error?: string };
    countryBaseline: { score: number; factors: string[] };
  };
  partialResults: boolean;
  failedSources: string[];
  generatedAt: Date;
  expiresAt: Date;
}

export class EnhancedRiskEngine {
  private riskAdapter: RiskAdapter;
  private weights = {
    sanctions: 0.45,
    pep: 0.15,
    adverseMedia: 0.15,
    countryBaseline: 0.10,
    internalHistory: 0.15,
  };

  constructor() {
    this.riskAdapter = createRiskAdapter();
    logger.info(`Initialized risk engine with adapter: ${this.riskAdapter.name}`);
  }

  async performRiskCheck(request: RiskCheckRequest): Promise<RiskAssessmentResult> {
    const startTime = Date.now();
    logger.info({ contractorName: request.contractorName, country: request.countryIso }, 'Starting risk assessment');

    // Check for cached result using idempotency key
    if (request.idempotencyKey) {
      const cached = await this.getCachedResult(request.idempotencyKey);
      if (cached) {
        logger.info({ idempotencyKey: request.idempotencyKey }, 'Returning cached risk assessment');
        return cached;
      }
    }

    try {
      // Get or create contractor
      const contractor = await this.getOrCreateContractor(request);
      
      // Get country information
      const country = await this.getCountryInfo(request.countryIso);
      if (!country) {
        throw new Error(`Country not found: ${request.countryIso}`);
      }

      // Perform parallel risk checks
      const [sanctionsResult, pepResult, adverseMediaResult] = await Promise.allSettled([
        this.checkSanctionsWithFallback(request.contractorName, request.countryIso),
        this.checkPEPWithFallback(request.contractorName, request.countryIso),
        this.checkAdverseMediaWithFallback(request.contractorName, request.countryIso)
      ]);

      // Calculate country baseline risk
      const countryBaseline = this.calculateCountryBaselineRisk(country);

      // Get internal history
      const internalHistory = await this.getInternalRiskHistory(contractor.id);

      // Calculate overall risk score
      const sourceResults = {
        sanctions: this.unwrapResult(sanctionsResult),
        pep: this.unwrapResult(pepResult),
        adverseMedia: this.unwrapResult(adverseMediaResult),
        countryBaseline
      };

      const overallScore = this.calculateOverallRisk(sourceResults, internalHistory);
      const riskTier = this.determineRiskTier(overallScore);
      
      // Generate insights
      const topRisks = this.identifyTopRisks(sourceResults, internalHistory, country);
      const recommendations = this.generateRecommendations(sourceResults, riskTier, country);
      const penaltyRange = this.estimatePenaltyRange(riskTier, country);

      // Check if we have partial results
      const failedSources = [
        !sourceResults.sanctions.success && 'sanctions',
        !sourceResults.pep.success && 'pep',
        !sourceResults.adverseMedia.success && 'adverse_media'
      ].filter(Boolean) as string[];

      const result: RiskAssessmentResult = {
        id: crypto.randomUUID(),
        contractorId: contractor.id,
        overallScore,
        riskTier,
        topRisks,
        recommendations,
        penaltyRange,
        sourceResults,
        partialResults: failedSources.length > 0,
        failedSources,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      // Store result in database
      await this.storeRiskResult(result);

      // Cache result if idempotency key provided
      if (request.idempotencyKey) {
        await this.cacheResult(request.idempotencyKey, result);
      }

      const duration = Date.now() - startTime;
      logger.info({ 
        contractorId: contractor.id, 
        riskTier, 
        overallScore, 
        duration,
        partialResults: result.partialResults,
        failedSources: result.failedSources
      }, 'Risk assessment completed');

      return result;

    } catch (error) {
      logger.error({ error, request }, 'Risk assessment failed');
      throw new Error(`Risk assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkSanctionsWithFallback(name: string, country: string) {
    try {
      const result = await this.riskAdapter.checkSanctions(name, country);
      return { ...result, success: true };
    } catch (error) {
      logger.warn({ error, name, country }, 'Sanctions check failed, using fallback');
      return {
        isListed: false,
        confidence: 50,
        sources: [],
        details: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkPEPWithFallback(name: string, country: string) {
    try {
      const result = await this.riskAdapter.checkPEP(name, country);
      return { ...result, success: true };
    } catch (error) {
      logger.warn({ error, name, country }, 'PEP check failed, using fallback');
      return {
        isPEP: false,
        confidence: 50,
        positions: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkAdverseMediaWithFallback(name: string, country: string) {
    try {
      const result = await this.riskAdapter.checkAdverseMedia(name, country);
      return { ...result, success: true };
    } catch (error) {
      logger.warn({ error, name, country }, 'Adverse media check failed, using fallback');
      return {
        riskScore: 10,
        confidence: 50,
        articles: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private unwrapResult(settledResult: PromiseSettledResult<any>) {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    } else {
      logger.error({ error: settledResult.reason }, 'Risk check promise rejected');
      return {
        success: false,
        error: settledResult.reason instanceof Error ? settledResult.reason.message : 'Unknown error'
      };
    }
  }

  private calculateCountryBaselineRisk(country: any) {
    const factors = [];
    let score = 0;

    // Risk factors based on country data
    if (country.riskLevel === 'high') {
      score += 80;
      factors.push('High-risk jurisdiction');
    } else if (country.riskLevel === 'medium') {
      score += 40;
      factors.push('Medium-risk jurisdiction');
    } else {
      score += 10;
      factors.push('Low-risk jurisdiction');
    }

    if (country.complianceScore < 70) {
      score += 20;
      factors.push('Low compliance score');
    }

    if (country.taxComplexity > 8) {
      score += 15;
      factors.push('High tax complexity');
    }

    if (country.contractorTypes.length < 2) {
      score += 10;
      factors.push('Limited contractor options');
    }

    return {
      score: Math.min(score, 100),
      factors
    };
  }

  private async getInternalRiskHistory(contractorId: string) {
    try {
      const history = await db
        .select()
        .from(riskScores)
        .where(eq(riskScores.contractorId, contractorId))
        .orderBy(desc(riskScores.createdAt))
        .limit(5);

      if (history.length === 0) {
        return { score: 5, factors: ['No previous history'] };
      }

      const avgScore = history.reduce((sum, record) => sum + record.overallScore, 0) / history.length;
      const recentTrend = history.length >= 2 ? 
        (history[0].overallScore > history[1].overallScore ? 'increasing' : 'stable') : 'stable';

      return {
        score: avgScore,
        factors: [`Previous assessments average: ${avgScore.toFixed(1)}`, `Trend: ${recentTrend}`]
      };
    } catch (error) {
      logger.warn({ error, contractorId }, 'Failed to get internal risk history');
      return { score: 5, factors: ['History unavailable'] };
    }
  }

  private calculateOverallRisk(sourceResults: any, internalHistory: any): number {
    let score = 0;

    // Sanctions (45% weight)
    if (sourceResults.sanctions.success) {
      score += (sourceResults.sanctions.isListed ? 90 : 5) * this.weights.sanctions;
    } else {
      score += 20 * this.weights.sanctions; // Conservative fallback
    }

    // PEP (15% weight)
    if (sourceResults.pep.success) {
      score += (sourceResults.pep.isPEP ? 70 : 10) * this.weights.pep;
    } else {
      score += 15 * this.weights.pep;
    }

    // Adverse Media (15% weight)
    if (sourceResults.adverseMedia.success) {
      score += sourceResults.adverseMedia.riskScore * this.weights.adverseMedia;
    } else {
      score += 20 * this.weights.adverseMedia;
    }

    // Country Baseline (10% weight)
    score += sourceResults.countryBaseline.score * this.weights.countryBaseline;

    // Internal History (15% weight)
    score += internalHistory.score * this.weights.internalHistory;

    return Math.round(Math.min(score, 100));
  }

  private determineRiskTier(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private identifyTopRisks(sourceResults: any, internalHistory: any, country: any): string[] {
    const risks = [];

    if (sourceResults.sanctions.isListed) {
      risks.push('Sanctions list match detected');
    }

    if (sourceResults.pep.isPEP) {
      risks.push('Politically Exposed Person identified');
    }

    if (sourceResults.adverseMedia.riskScore > 50) {
      risks.push('Adverse media coverage found');
    }

    if (country.riskLevel === 'high') {
      risks.push(`High-risk jurisdiction: ${country.name}`);
    }

    if (country.complianceScore < 60) {
      risks.push('Poor compliance environment');
    }

    if (internalHistory.score > 60) {
      risks.push('Previous high-risk assessments');
    }

    return risks.slice(0, 5); // Return top 5 risks
  }

  private generateRecommendations(sourceResults: any, riskTier: string, country: any): string[] {
    const recommendations = [];

    if (riskTier === 'high') {
      recommendations.push('Conduct enhanced due diligence');
      recommendations.push('Require additional documentation');
      recommendations.push('Implement monthly monitoring');
    }

    if (sourceResults.sanctions.isListed) {
      recommendations.push('Immediate engagement suspension required');
      recommendations.push('Legal review and compliance clearance needed');
    }

    if (sourceResults.pep.isPEP) {
      recommendations.push('Enhanced KYC procedures required');
      recommendations.push('Senior management approval needed');
    }

    if (country.riskLevel === 'high') {
      recommendations.push(`Review ${country.name} country-specific compliance requirements`);
      recommendations.push('Consider alternative engagement structures');
    }

    if (riskTier === 'medium') {
      recommendations.push('Standard due diligence with quarterly reviews');
      recommendations.push('Monitor for regulatory changes');
    }

    if (riskTier === 'low') {
      recommendations.push('Standard onboarding process approved');
      recommendations.push('Annual risk review recommended');
    }

    return recommendations.slice(0, 6);
  }

  private estimatePenaltyRange(riskTier: string, country: any) {
    const currency = country.currencyCode;
    
    switch (riskTier) {
      case 'high':
        return {
          min: country.currencyCode === 'USD' ? 50000 : 40000,
          max: country.currencyCode === 'USD' ? 500000 : 400000,
          currency
        };
      case 'medium':
        return {
          min: country.currencyCode === 'USD' ? 10000 : 8000,
          max: country.currencyCode === 'USD' ? 100000 : 80000,
          currency
        };
      default:
        return {
          min: country.currencyCode === 'USD' ? 1000 : 800,
          max: country.currencyCode === 'USD' ? 25000 : 20000,
          currency
        };
    }
  }

  private async getOrCreateContractor(request: RiskCheckRequest) {
    try {
      // Try to find existing contractor
      const existing = await db
        .select()
        .from(contractors)
        .where(eq(contractors.name, request.contractorName))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      // Create new contractor
      const [newContractor] = await db
        .insert(contractors)
        .values({
          name: request.contractorName,
          email: request.contractorEmail || `${request.contractorName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          countryIso: request.countryIso,
          contractorType: request.contractorType,
          status: 'pending',
        })
        .returning();

      return newContractor;
    } catch (error) {
      logger.error({ error, request }, 'Failed to get or create contractor');
      throw error;
    }
  }

  private async getCountryInfo(iso: string) {
    try {
      const [country] = await db
        .select()
        .from(countries)
        .where(eq(countries.iso, iso))
        .limit(1);

      return country;
    } catch (error) {
      logger.error({ error, iso }, 'Failed to get country info');
      return null;
    }
  }

  private async storeRiskResult(result: RiskAssessmentResult) {
    try {
      await db.insert(riskScores).values({
        id: result.id,
        contractorId: result.contractorId,
        overallScore: result.overallScore,
        riskTier: result.riskTier,
        sanctionsScore: result.sourceResults.sanctions.isListed ? 90 : 5,
        pepScore: result.sourceResults.pep.isPEP ? 70 : 10,
        adverseMediaScore: result.sourceResults.adverseMedia.riskScore,
        countryRiskScore: result.sourceResults.countryBaseline.score,
        details: {
          topRisks: result.topRisks,
          recommendations: result.recommendations,
          penaltyRange: result.penaltyRange,
          sourceResults: result.sourceResults,
          partialResults: result.partialResults,
          failedSources: result.failedSources,
        },
        createdAt: result.generatedAt,
      });
    } catch (error) {
      logger.error({ error, resultId: result.id }, 'Failed to store risk result');
    }
  }

  private async getCachedResult(idempotencyKey: string): Promise<RiskAssessmentResult | null> {
    try {
      const cached = await redis?.get(`risk:${idempotencyKey}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn({ error, idempotencyKey }, 'Failed to get cached result');
      return null;
    }
  }

  private async cacheResult(idempotencyKey: string, result: RiskAssessmentResult) {
    try {
      await redis?.setex(`risk:${idempotencyKey}`, 86400, JSON.stringify(result)); // 24 hour cache
    } catch (error) {
      logger.warn({ error, idempotencyKey }, 'Failed to cache result');
    }
  }
}

export const enhancedRiskEngine = new EnhancedRiskEngine();