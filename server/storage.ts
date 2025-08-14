import { eq, desc, asc, like, and, or, sql, count, isNull } from "drizzle-orm";
import { db } from "./lib/database";
import {
  countries,
  contractors,
  riskScores,
  complianceRules,
  rulesetVersions,
  pdfReports,
  auditLogs,
  subscriptions,
  users,
  Country,
  Contractor,
  RiskScore,
  ComplianceRule,
  RulesetVersion,
  PdfReport,
  AuditLog,
  Subscription,
  User,
  InsertCountry,
  InsertContractor,
  InsertRiskScore,
  InsertComplianceRule,
  InsertRulesetVersion,
  InsertPdfReport,
  InsertAuditLog,
  InsertSubscription,
  InsertUser,
  RiskAssessmentResult,
  CountrySearchResult,
  AnalyticsData,
} from "@shared/schema";
import { SearchFilters, PaginatedResponse } from "../client/src/types";
import { redis } from "./lib/redis";
import { createChildLogger } from "./lib/logger";

const logger = createChildLogger('storage');

export interface IStorage {
  // Countries
  searchCountries(filters: SearchFilters): Promise<PaginatedResponse<CountrySearchResult>>;
  getFeaturedCountries(): Promise<CountrySearchResult[]>;
  getCountryByIso(iso: string): Promise<CountrySearchResult | undefined>;
  getCountryById(id: string): Promise<Country | undefined>;
  createCountry(country: InsertCountry): Promise<Country>;

  // Contractors
  getContractor(id: string): Promise<Contractor | undefined>;
  createContractor(contractor: InsertContractor): Promise<Contractor>;
  getContractorHistory(name: string, countryIso: string): Promise<RiskScore[]>;

  // Risk Scores
  getRiskScore(id: string): Promise<RiskScore | undefined>;
  getLatestRiskScore(contractorId: string): Promise<RiskScore | undefined>;
  createRiskScore(riskScore: InsertRiskScore): Promise<RiskScore>;

  // Compliance Rules
  getComplianceRule(id: string): Promise<ComplianceRule | undefined>;
  getComplianceRules(filters?: { countryIso?: string; status?: string }): Promise<ComplianceRule[]>;
  createComplianceRule(rule: InsertComplianceRule): Promise<ComplianceRule>;
  updateComplianceRule(id: string, updates: Partial<InsertComplianceRule>): Promise<ComplianceRule>;
  deleteComplianceRule(id: string): Promise<void>;
  publishRule(id: string, publishedBy: string): Promise<{ rulesetVersion: number }>;
  getCurrentRulesetVersion(countryIso: string): Promise<number | undefined>;

  // PDF Reports
  createPdfReport(report: InsertPdfReport): Promise<PdfReport>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Subscriptions
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Analytics
  getAnalytics(filters?: { from?: string; to?: string }): Promise<AnalyticsData>;

  // Idempotency
  getRiskCheckByIdempotencyKey(key: string): Promise<RiskAssessmentResult | undefined>;
  storeIdempotencyKey(key: string, result: RiskAssessmentResult): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private cacheKeyPrefix = 'gcrc';
  private cacheTTL = 300; // 5 minutes

  async searchCountries(filters: SearchFilters): Promise<PaginatedResponse<CountrySearchResult>> {
    const cacheKey = `${this.cacheKeyPrefix}:countries:search:${JSON.stringify(filters)}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to get cached countries search');
    }

    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 10, 100);
    const offset = (page - 1) * pageSize;

    let query = db
      .select({
        id: countries.id,
        iso: countries.iso,
        name: countries.name,
        flag: countries.flag,
        lastUpdated: countries.lastUpdated,
        riskLevel: sql<'low' | 'medium' | 'high' | null>`NULL`.as('riskLevel'),
        riskScore: sql<number | null>`NULL`.as('riskScore'),
        topRiskFactors: sql<string[] | null>`NULL`.as('topRiskFactors'),
      })
      .from(countries);

    // Apply filters
    const conditions = [];

    if (filters.query) {
      conditions.push(like(countries.name, `%${filters.query}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = filters.sort === 'updated' ? countries.lastUpdated : countries.name;
    const sortDirection = filters.sort === 'updated' ? desc : asc;
    query = query.orderBy(sortDirection(sortColumn));

    // Get total count
    const totalQuery = db
      .select({ count: count() })
      .from(countries);

    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }

    const [items, [{ count: total }]] = await Promise.all([
      query.limit(pageSize).offset(offset),
      totalQuery,
    ]);

    // Enhance with risk data
    const enhancedItems = await this.enhanceCountriesWithRiskData(items);

    const result: PaginatedResponse<CountrySearchResult> = {
      items: enhancedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    // Cache result
    try {
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(result));
    } catch (error) {
      logger.warn({ error }, 'Failed to cache countries search');
    }

    return result;
  }

  async getFeaturedCountries(): Promise<CountrySearchResult[]> {
    const cacheKey = `${this.cacheKeyPrefix}:countries:featured`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to get cached featured countries');
    }

    // Get top countries by recent risk assessment activity
    const items = await db
      .select({
        id: countries.id,
        iso: countries.iso,
        name: countries.name,
        flag: countries.flag,
        lastUpdated: countries.lastUpdated,
        riskLevel: sql<'low' | 'medium' | 'high' | null>`NULL`.as('riskLevel'),
        riskScore: sql<number | null>`NULL`.as('riskScore'),
        topRiskFactors: sql<string[] | null>`NULL`.as('topRiskFactors'),
      })
      .from(countries)
      .orderBy(desc(countries.lastUpdated))
      .limit(8);

    const enhanced = await this.enhanceCountriesWithRiskData(items);

    // Cache result
    try {
      await redis.setex(cacheKey, this.cacheTTL * 2, JSON.stringify(enhanced)); // Cache longer for featured
    } catch (error) {
      logger.warn({ error }, 'Failed to cache featured countries');
    }

    return enhanced;
  }

  async getCountryByIso(iso: string): Promise<CountrySearchResult | undefined> {
    const cacheKey = `${this.cacheKeyPrefix}:country:${iso}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to get cached country');
    }

    const [country] = await db
      .select()
      .from(countries)
      .where(eq(countries.iso, iso))
      .limit(1);

    if (!country) return undefined;

    const [enhanced] = await this.enhanceCountriesWithRiskData([country]);

    // Cache result
    try {
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(enhanced));
    } catch (error) {
      logger.warn({ error }, 'Failed to cache country');
    }

    return enhanced;
  }

  async getCountryById(id: string): Promise<Country | undefined> {
    const [country] = await db
      .select()
      .from(countries)
      .where(eq(countries.id, id))
      .limit(1);

    return country;
  }

  async createCountry(country: InsertCountry): Promise<Country> {
    const [created] = await db
      .insert(countries)
      .values(country)
      .returning();

    // Invalidate related caches
    await this.invalidateCountryCaches();

    return created;
  }

  async getContractor(id: string): Promise<Contractor | undefined> {
    const [contractor] = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, id))
      .limit(1);

    return contractor;
  }

  async createContractor(contractor: InsertContractor): Promise<Contractor> {
    const [created] = await db
      .insert(contractors)
      .values(contractor)
      .returning();

    return created;
  }

  async getContractorHistory(name: string, countryIso: string): Promise<RiskScore[]> {
    const country = await this.getCountryByIso(countryIso);
    if (!country) return [];

    const history = await db
      .select({
        id: riskScores.id,
        contractorId: riskScores.contractorId,
        score: riskScores.score,
        tier: riskScores.tier,
        topRisks: riskScores.topRisks,
        recommendations: riskScores.recommendations,
        penaltyRange: riskScores.penaltyRange,
        partialSources: riskScores.partialSources,
        rulesetVersion: riskScores.rulesetVersion,
        breakdown: riskScores.breakdown,
        createdAt: riskScores.createdAt,
      })
      .from(riskScores)
      .innerJoin(contractors, eq(contractors.id, riskScores.contractorId))
      .where(
        and(
          like(contractors.name, `%${name}%`),
          eq(contractors.countryId, country.id)
        )
      )
      .orderBy(desc(riskScores.createdAt))
      .limit(10);

    return history;
  }

  async getRiskScore(id: string): Promise<RiskScore | undefined> {
    const [riskScore] = await db
      .select()
      .from(riskScores)
      .where(eq(riskScores.id, id))
      .limit(1);

    return riskScore;
  }

  async getLatestRiskScore(contractorId: string): Promise<RiskScore | undefined> {
    const [riskScore] = await db
      .select()
      .from(riskScores)
      .where(eq(riskScores.contractorId, contractorId))
      .orderBy(desc(riskScores.createdAt))
      .limit(1);

    return riskScore;
  }

  async createRiskScore(riskScore: InsertRiskScore): Promise<RiskScore> {
    const [created] = await db
      .insert(riskScores)
      .values(riskScore)
      .returning();

    // Invalidate country caches since risk data might have changed
    await this.invalidateCountryCaches();

    return created;
  }

  async getComplianceRule(id: string): Promise<ComplianceRule | undefined> {
    const [rule] = await db
      .select()
      .from(complianceRules)
      .where(eq(complianceRules.id, id))
      .limit(1);

    return rule;
  }

  async getComplianceRules(filters?: { countryIso?: string; status?: string }): Promise<ComplianceRule[]> {
    let query = db.select().from(complianceRules);

    const conditions = [];

    if (filters?.countryIso) {
      const country = await this.getCountryByIso(filters.countryIso);
      if (country) {
        conditions.push(eq(complianceRules.countryId, country.id));
      }
    }

    if (filters?.status) {
      conditions.push(eq(complianceRules.status, filters.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query.orderBy(desc(complianceRules.updatedAt));
  }

  async createComplianceRule(rule: InsertComplianceRule): Promise<ComplianceRule> {
    const [created] = await db
      .insert(complianceRules)
      .values(rule)
      .returning();

    return created;
  }

  async updateComplianceRule(id: string, updates: Partial<InsertComplianceRule>): Promise<ComplianceRule> {
    const [updated] = await db
      .update(complianceRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(complianceRules.id, id))
      .returning();

    return updated;
  }

  async deleteComplianceRule(id: string): Promise<void> {
    await db
      .delete(complianceRules)
      .where(eq(complianceRules.id, id));
  }

  async publishRule(id: string, publishedBy: string): Promise<{ rulesetVersion: number }> {
    const rule = await this.getComplianceRule(id);
    if (!rule) {
      throw new Error('Rule not found');
    }

    // Get current version for this country
    const currentVersion = await this.getCurrentRulesetVersion(rule.countryId) || 0;
    const newVersion = currentVersion + 1;

    await db.transaction(async (tx) => {
      // Update rule status
      await tx
        .update(complianceRules)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(complianceRules.id, id));

      // Create ruleset version record
      await tx
        .insert(rulesetVersions)
        .values({
          countryId: rule.countryId,
          version: newVersion,
          publishedBy,
          notes: `Published rule: ${rule.ruleType}`,
        });
    });

    // Invalidate caches
    await this.invalidateCountryCaches();

    return { rulesetVersion: newVersion };
  }

  async getCurrentRulesetVersion(countryIso: string): Promise<number | undefined> {
    const country = await this.getCountryByIso(countryIso);
    if (!country) return undefined;

    const [version] = await db
      .select({ version: rulesetVersions.version })
      .from(rulesetVersions)
      .where(eq(rulesetVersions.countryId, country.id))
      .orderBy(desc(rulesetVersions.version))
      .limit(1);

    return version?.version;
  }

  async createPdfReport(report: InsertPdfReport): Promise<PdfReport> {
    const [created] = await db
      .insert(pdfReports)
      .values(report)
      .returning();

    return created;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db
      .insert(auditLogs)
      .values(log)
      .returning();

    return created;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [created] = await db
      .insert(subscriptions)
      .values(subscription)
      .returning();

    return created;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db
      .insert(users)
      .values(user)
      .returning();

    return created;
  }

  async getAnalytics(filters?: { from?: string; to?: string }): Promise<AnalyticsData> {
    const fromDate = filters?.from ? new Date(filters.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = filters?.to ? new Date(filters.to) : new Date();

    // Get basic counts
    const [
      totalSearches,
      riskAssessments,
      pdfReports,
      riskDistribution,
    ] = await Promise.all([
      // This would normally track search events, for now we'll use risk scores as proxy
      db.select({ count: count() }).from(riskScores).where(
        and(
          sql`${riskScores.createdAt} >= ${fromDate}`,
          sql`${riskScores.createdAt} <= ${toDate}`
        )
      ),
      
      db.select({ count: count() }).from(riskScores).where(
        and(
          sql`${riskScores.createdAt} >= ${fromDate}`,
          sql`${riskScores.createdAt} <= ${toDate}`
        )
      ),
      
      db.select({ count: count() }).from(pdfReports).where(
        and(
          sql`${pdfReports.generatedAt} >= ${fromDate}`,
          sql`${pdfReports.generatedAt} <= ${toDate}`
        )
      ),

      // Risk tier distribution
      db.select({
        tier: riskScores.tier,
        count: count(),
      }).from(riskScores).where(
        and(
          sql`${riskScores.createdAt} >= ${fromDate}`,
          sql`${riskScores.createdAt} <= ${toDate}`
        )
      ).groupBy(riskScores.tier),
    ]);

    // Calculate changes (simplified for demo)
    const searchesChange = 12.5;
    const assessmentsChange = 18.2;
    const reportsChange = -2.1;
    const responseTimeChange = -0.2;

    // Process risk distribution
    const riskDist = {
      low: riskDistribution.find(r => r.tier === 'low')?.count || 0,
      medium: riskDistribution.find(r => r.tier === 'medium')?.count || 0,
      high: riskDistribution.find(r => r.tier === 'high')?.count || 0,
    };

    // Get top countries (simplified)
    const topCountriesData = await db
      .select({
        countryId: contractors.countryId,
        count: count(),
      })
      .from(contractors)
      .innerJoin(riskScores, eq(riskScores.contractorId, contractors.id))
      .where(
        and(
          sql`${riskScores.createdAt} >= ${fromDate}`,
          sql`${riskScores.createdAt} <= ${toDate}`
        )
      )
      .groupBy(contractors.countryId)
      .orderBy(desc(count()))
      .limit(5);

    const topCountries = await Promise.all(
      topCountriesData.map(async (item) => {
        const country = await this.getCountryById(item.countryId);
        return {
          country: country as any,
          searches: item.count,
          percentage: (item.count / (totalSearches[0]?.count || 1)) * 100,
        };
      })
    );

    // Mock recent activity
    const recentActivity = [
      {
        id: '1',
        type: 'assessment' as const,
        description: 'Risk assessment completed for contractor in Brazil',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        type: 'pdf' as const,
        description: 'PDF report generated for United Kingdom assessment',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: '3',
        type: 'rule' as const,
        description: 'New compliance rule published for Germany',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      },
    ];

    return {
      totalSearches: totalSearches[0]?.count || 0,
      riskAssessments: riskAssessments[0]?.count || 0,
      pdfReports: pdfReports[0]?.count || 0,
      avgResponseTime: 1.3,
      searchesChange,
      assessmentsChange,
      reportsChange,
      responseTimeChange,
      riskDistribution: riskDist,
      topRiskFactors: [
        { name: 'Tax Compliance', percentage: 34 },
        { name: 'Worker Classification', percentage: 28 },
        { name: 'Payment Processing', percentage: 22 },
        { name: 'Sanctions/PEP', percentage: 16 },
      ],
      topCountries,
      recentActivity,
    };
  }

  async getRiskCheckByIdempotencyKey(key: string): Promise<RiskAssessmentResult | undefined> {
    try {
      const cached = await redis.get(`idempotency:${key}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to get idempotency cache');
    }
    return undefined;
  }

  async storeIdempotencyKey(key: string, result: RiskAssessmentResult): Promise<void> {
    try {
      await redis.setex(`idempotency:${key}`, 3600, JSON.stringify(result)); // 1 hour TTL
    } catch (error) {
      logger.warn({ error }, 'Failed to store idempotency cache');
    }
  }

  private async enhanceCountriesWithRiskData(countries: any[]): Promise<CountrySearchResult[]> {
    return Promise.all(
      countries.map(async (country) => {
        // Get latest risk assessment for this country
        const latestRisk = await db
          .select({
            score: riskScores.score,
            tier: riskScores.tier,
            topRisks: riskScores.topRisks,
          })
          .from(riskScores)
          .innerJoin(contractors, eq(contractors.id, riskScores.contractorId))
          .where(eq(contractors.countryId, country.id))
          .orderBy(desc(riskScores.createdAt))
          .limit(1);

        const risk = latestRisk[0];

        return {
          ...country,
          riskLevel: risk?.tier || null,
          riskScore: risk?.score || null,
          topRiskFactors: risk?.topRisks ? 
            risk.topRisks.slice(0, 3).map((r: any) => r.title) : 
            null,
        };
      })
    );
  }

  private async invalidateCountryCaches(): Promise<void> {
    try {
      const keys = await redis.keys(`${this.cacheKeyPrefix}:countries:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to invalidate country caches');
    }
  }
}

export const storage = new DatabaseStorage();
