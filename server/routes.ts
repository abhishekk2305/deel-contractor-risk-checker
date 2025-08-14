import express from "express";
import type { Express } from "express";
import { createServer } from "http";
import { z } from "zod";
import rateLimit from "express-rate-limit";

import { db } from "./lib/database";
import { countries, contractors, riskScores, complianceRules, auditLogs, pdfReports } from "@shared/schema";
import { eq, desc, ilike, or, and, sql, count, gte } from "drizzle-orm";
import { enhancedRiskEngine } from "./services/risk-engine-enhanced";
import { pdfService } from "./services/pdf-service";
import { analyticsService } from "./services/analytics-service";
import { metricsMiddleware } from "./middleware/metrics";
import { healthCheck, metricsEndpoint, readinessCheck, livenessCheck } from "./middleware/health";
import { createChildLogger } from "./lib/logger";

const logger = createChildLogger('routes');

export function registerRoutes(app: Express) {
  // Security headers (temporarily disabled for build)
  // TODO: Add proper security headers middleware
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  
  // Apply metrics middleware globally
  app.use(metricsMiddleware);
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use("/api", limiter);

  // Health and monitoring endpoints
  app.get("/health", healthCheck);
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      const [dbCheck] = await db.select({ count: count() }).from(countries).limit(1);
      
      // Check sanctions provider health
      let sanctionsHealth = { status: 'unknown', provider: 'none', baseUrl: '' };
      try {
        const { SanctionsFactory } = await import('./providers/sanctions/sanctionsFactory');
        const healthResult = await SanctionsFactory.healthCheck();
        
        // Get base URL based on provider
        let baseUrl = '';
        const provider = healthResult.provider;
        if (provider === 'opensanctions') {
          baseUrl = process.env.OPEN_SANCTIONS_BASE_URL || 'https://api.opensanctions.org';
        } else if (provider === 'seon') {
          baseUrl = process.env.SEON_API_URL || 'https://api.seon.io';
        } else if (provider === 'amlbot') {
          baseUrl = process.env.AMLBOT_API_URL || 'https://api.amlbot.com';
        }
        
        sanctionsHealth = {
          status: healthResult.status,
          provider: healthResult.provider,
          baseUrl,
          ...(healthResult.responseTime && { responseTime: healthResult.responseTime })
        };
      } catch (error) {
        sanctionsHealth = { 
          status: 'error', 
          provider: process.env.SANCTIONS_PROVIDER || 'unknown',
          baseUrl: '',
          ...(error instanceof Error && { error: error.message })
        };
      }
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        build_sha: process.env.BUILD_SHA || 'dev',
        database: true,
        redis: true, // Mock for now
        s3: true, // Mock for now
        providers: {
          sanctions: sanctionsHealth.provider,
          media: process.env.FEATURE_MEDIA_PROVIDER || 'mock'
        },
        provider_urls: {
          sanctions: sanctionsHealth.baseUrl,
          media: process.env.FEATURE_MEDIA_PROVIDER === 'newsapi' ? 'https://newsapi.org' : 'mock'
        },
        responseTime: Date.now() - ((req as any).start || Date.now()),
        version: '1.0.0'
      });
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: false,
        redis: false,
        s3: false,
        error: 'Service unavailable'
      });
    }
  });
  app.get("/metrics", metricsEndpoint);  
  app.get("/ready", readinessCheck);
  app.get("/live", livenessCheck);

  // Analytics endpoint
  app.get("/api/analytics", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await analyticsService.getAnalyticsData(days);
      res.json(analytics);
    } catch (error) {
      logger.error({ error }, 'Failed to get analytics');
      res.status(500).json({ error: "Failed to fetch analytics data" });
    }
  });

  // Countries API - simplified to match actual schema
  app.get("/api/countries", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search || req.query.query) as string || "";

      // Track search event
      await analyticsService.trackEvent({
        event: 'search_submit',
        metadata: { search, page }
      });

      let baseQuery = db.select().from(countries);
      let results;
      let total = 0;

      if (search) {
        const searchCondition = or(
          sql`unaccent(${countries.name}) ILIKE unaccent(${`%${search}%`})`,
          ilike(countries.iso, `%${search.toUpperCase()}%`)
        );
        
        const offset = (page - 1) * limit;
        results = await baseQuery
          .where(searchCondition)
          .limit(limit)
          .offset(offset)
          .orderBy(countries.name);

        // Get total count for pagination
        const [{ count: totalCount }] = await db
          .select({ count: count() })
          .from(countries)
          .where(searchCondition);
        total = totalCount;
      } else {
        const offset = (page - 1) * limit;
        results = await baseQuery
          .limit(limit)
          .offset(offset)
          .orderBy(countries.name);

        // Get total count for pagination
        const [{ count: totalCount }] = await db
          .select({ count: count() })
          .from(countries);
        total = totalCount;
      }

      res.json({
        countries: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error({ error }, "Error fetching countries");
      res.status(500).json({ error: "Failed to fetch countries" });
    }
  });

  // IMPORTANT: This must come BEFORE the generic :iso route
  // Get popular countries - top 6 by search count in last 7 days  
  app.get("/api/countries/popular", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      const window = req.query.window as string || '7d';
      
      let daysBack = 7;
      if (window === '30d') daysBack = 30;
      if (window === '90d') daysBack = 90;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Get analytics data and extract country popularity
      const analytics = await analyticsService.getAnalyticsData(daysBack);
      const topCountriesData = analytics.topCountries || [];
      
      if (topCountriesData.length === 0) {
        // Fallback to alphabetical if no analytics data
        const fallbackCountries = await db
          .select()
          .from(countries)
          .orderBy(countries.name)
          .limit(limit);
        
        return res.json({
          countries: fallbackCountries.map(c => ({ ...c, searchCount: 0 })),
          window,
          fallback: true,
          message: `No search activity in last ${daysBack} days - showing alphabetical`
        });
      }

      // Get country details for popular countries
      const popularCountryNames = topCountriesData.slice(0, limit).map(tc => tc.country);
      const countriesWithCounts = await db
        .select()
        .from(countries)
        .where(sql`${countries.name} = ANY(${popularCountryNames})`)
        .then(countryRows => 
          countryRows.map(country => {
            const countData = topCountriesData.find(tc => tc.country === country.name);
            return {
              ...country,
              searchCount: countData?.count || 0
            };
          })
        );

      // Sort by search count descending
      countriesWithCounts.sort((a, b) => b.searchCount - a.searchCount);
      
      res.json({
        countries: countriesWithCounts,
        window,
        fallback: false,
        message: `Ranked by searches in the last ${daysBack} days`
      });
    } catch (error) {
      logger.error({ error }, "Error fetching popular countries");
      // Fallback to alphabetical
      const fallbackCountries = await db
        .select()
        .from(countries)
        .orderBy(countries.name)
        .limit(parseInt(req.query.limit as string) || 6);
      
      res.json({
        countries: fallbackCountries,
        fallback: true,
        message: 'Using alphabetical fallback due to error'
      });
    }
  });

  // Get country by ISO code (must be after specific routes like /popular)
  app.get("/api/countries/:iso", async (req, res) => {
    try {
      const { iso } = req.params;
      const [country] = await db
        .select()
        .from(countries)
        .where(eq(countries.iso, iso.toUpperCase()))
        .limit(1);

      if (!country) {
        return res.status(404).json({ error: "Country not found" });
      }

      // Track country view
      await analyticsService.trackEvent({
        event: 'country_view',
        metadata: { country: country.name, iso: country.iso }
      });

      res.json({ country });
    } catch (error) {
      logger.error({ error }, "Error fetching country");
      res.status(500).json({ error: "Failed to fetch country" });
    }
  });

  // Risk check endpoint - simplified mock implementation
  const riskCheckSchema = z.object({
    contractorName: z.string().min(1, "Contractor name is required"),
    contractorEmail: z.string().email().optional(),
    countryIso: z.string().length(2, "Country ISO must be 2 characters"),
    contractorType: z.enum(['independent', 'eor', 'freelancer']),
  });

  app.post("/api/risk-check", async (req, res) => {
    try {
      const validatedData = riskCheckSchema.parse(req.body);
      
      logger.info({ 
        contractor: validatedData.contractorName, 
        country: validatedData.countryIso 
      }, 'Starting risk check');

      // Get country information
      const [country] = await db
        .select()
        .from(countries)
        .where(eq(countries.iso, validatedData.countryIso.toUpperCase()))
        .limit(1);

      if (!country) {
        return res.status(404).json({ error: "Country not found" });
      }

      // Create or get contractor
      const [contractor] = await db.insert(contractors).values({
        name: validatedData.contractorName,
        countryId: country.id,
        type: validatedData.contractorType,
        paymentMethod: 'wire' // Default payment method
      }).returning();

      // Use enhanced risk engine for real risk assessment
      const { EnhancedRiskEngine } = await import('./services/risk-engine-enhanced');
      const riskEngine = new EnhancedRiskEngine();
      
      const result = await riskEngine.assessRisk({
        contractorName: validatedData.contractorName,
        contractorEmail: validatedData.contractorEmail,
        countryIso: validatedData.countryIso,
        contractorType: validatedData.contractorType
      });

      // Extract key fields for database storage
      const overallScore = result.overallScore;
      const riskTier = result.riskTier;
      const topRisks = result.topRisks;
      const recommendations = result.recommendations;

      // Store risk score
      const [riskScore] = await db.insert(riskScores).values({
        contractorId: contractor.id,
        score: overallScore,
        tier: riskTier,
        topRisks: topRisks,
        recommendations: recommendations,
        penaltyRange: `$5,000 - $50,000`,
        rulesetVersion: 1,
        breakdown: {
          compliance: overallScore,
          tax: Math.max(overallScore - 10, 20),
          employment: Math.max(overallScore - 5, 25)
        }
      }).returning();

      // Track successful risk check
      await analyticsService.trackEvent({
        event: 'risk_check_success',
        metadata: {
          contractorName: validatedData.contractorName,
          countryIso: validatedData.countryIso,
          riskTier: riskTier,
          overallScore: overallScore
        }
      });

      // Add provider information to the response and include the risk score ID for PDF generation
      const responseResult = {
        ...result,
        id: riskScore.id, // Use risk score ID for PDF generation
        contractorId: contractor.id,
        providerInfo: result.providerInfo || {
          sanctions: {
            source: "opensanctions",
            hits_count: result.breakdown?.sanctions || 0,
            top_matches: [],
            lists: []
          },
          media: {
            source: "mock",
            mentions_count: 0,
            keywords: []
          }
        },
        partial_sources: result.partialSources || []
      };

      res.json({
        success: true,
        result: responseResult
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors
        });
      }

      logger.error({ error }, 'Risk check failed');
      res.status(500).json({
        error: "Risk assessment failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // PDF generation endpoints - standardized to /api/pdf-report
  app.post("/api/pdf-report", async (req, res) => {
    try {
      const { riskAssessmentId } = req.body;

      if (!riskAssessmentId) {
        return res.status(400).json({ error: "Risk assessment ID is required" });
      }

      // Get risk assessment from database - try by contractor ID first (backward compatibility)
      let riskScore = await db
        .select()
        .from(riskScores)
        .where(eq(riskScores.contractorId, riskAssessmentId))
        .orderBy(desc(riskScores.createdAt))
        .limit(1)
        .then(rows => rows[0]);

      // If not found, try by risk score ID directly
      if (!riskScore) {
        riskScore = await db
          .select()
          .from(riskScores)
          .where(eq(riskScores.id, riskAssessmentId))
          .limit(1)
          .then(rows => rows[0]);
      }

      if (!riskScore) {
        return res.status(404).json({ error: "Risk assessment not found" });
      }

      // Get contractor info
      const [contractor] = await db
        .select()
        .from(contractors)
        .where(eq(contractors.id, riskScore.contractorId))
        .limit(1);

      // Get country info
      const [country] = await db
        .select()
        .from(countries)
        .where(eq(countries.id, contractor?.countryId || ''))
        .limit(1);

      // Track PDF generation
      await analyticsService.trackEvent({
        event: 'pdf_generate',
        metadata: {
          contractorId: riskScore.contractorId,
          contractorName: contractor?.name,
          riskTier: riskScore.tier
        }
      });

      // Enqueue PDF generation
      const { PDFService } = await import('./services/pdf-service');
      const pdfServiceInstance = new PDFService();
      
      const jobId = await pdfServiceInstance.enqueuePDFGeneration({
        contractorName: contractor?.name || 'Unknown',
        countryName: country?.name || 'Unknown',
        riskAssessment: {
          id: riskScore.id,
          contractorId: riskScore.contractorId,
          overallScore: riskScore.score,
          riskTier: riskScore.tier,
          topRisks: riskScore.topRisks as any[],
          recommendations: riskScore.recommendations as string[]
        }
      });

      res.status(202).json({
        job_id: jobId,
        message: "PDF generation started"
      });
    } catch (error) {
      logger.error({ error }, 'PDF generation failed');
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Get PDF job status - standardized to /api/pdf-report/:id
  app.get("/api/pdf-report/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { PDFService } = await import('./services/pdf-service');
      const pdfServiceInstance = new PDFService();
      const status = await pdfServiceInstance.getJobStatus(id);

      if (!status) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Track PDF download success
      if (status.status === 'completed' && req.query.downloaded === 'true') {
        await analyticsService.trackEvent({
          event: 'pdf_download_success',
          metadata: {
            jobId: id,
            contractorName: status.contractorName
          }
        });
      }

      res.json(status);
    } catch (error) {
      logger.error({ error }, 'Failed to get PDF job status');
      res.status(500).json({ error: "Failed to get job status" });
    }
  });

  // Compliance rules endpoint (for admin CMS)
  app.get("/api/compliance-rules", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const offset = (page - 1) * limit;
      const results = await db
        .select({
          id: complianceRules.id,
          countryId: complianceRules.countryId,
          ruleType: complianceRules.ruleType,
          description: complianceRules.description,
          severity: complianceRules.severity,
          status: complianceRules.status,
          version: complianceRules.version,
          effectiveFrom: complianceRules.effectiveFrom,
          updatedAt: complianceRules.updatedAt,
          country: {
            name: countries.name,
            iso: countries.iso
          }
        })
        .from(complianceRules)
        .leftJoin(countries, eq(complianceRules.countryId, countries.id))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(complianceRules.updatedAt));

      // Get total count
      const [{ count: total }] = await db.select({ count: count() }).from(complianceRules);

      res.json({
        rules: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error({ error }, "Error fetching compliance rules");
      res.status(500).json({ error: "Failed to fetch compliance rules" });
    }
  });

  // Admin CMS - Compliance Rules (simplified)
  app.get("/api/admin/rules", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const offset = (page - 1) * limit;
      const results = await db
        .select({
          id: complianceRules.id,
          countryId: complianceRules.countryId,
          ruleType: complianceRules.ruleType,
          description: complianceRules.description,
          severity: complianceRules.severity,
          status: complianceRules.status,
          version: complianceRules.version,
          effectiveFrom: complianceRules.effectiveFrom,
          updatedAt: complianceRules.updatedAt,
          country: {
            name: countries.name,
            iso: countries.iso
          }
        })
        .from(complianceRules)
        .leftJoin(countries, eq(complianceRules.countryId, countries.id))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(complianceRules.updatedAt));

      // Get total count
      const [{ count: total }] = await db.select({ count: count() }).from(complianceRules);

      res.json({
        rules: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error({ error }, "Error fetching compliance rules");
      res.status(500).json({ error: "Failed to fetch compliance rules" });
    }
  });

  // Create new compliance rule (simplified)
  const createRuleSchema = z.object({
    countryId: z.string().uuid(),
    ruleType: z.string().min(1),
    description: z.string().min(1),
    severity: z.number().min(1).max(10),
    effectiveFrom: z.string().transform(str => new Date(str).toISOString().split('T')[0]),
    sourceUrl: z.string().optional(),
  });

  app.post("/api/admin/rules", async (req, res) => {
    try {
      const validatedData = createRuleSchema.parse(req.body);

      const [newRule] = await db.insert(complianceRules).values({
        ...validatedData,
        effectiveFrom: validatedData.effectiveFrom,
        version: 1,
        updatedAt: new Date(),
      }).returning();

      res.status(201).json({ rule: newRule });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      logger.error({ error }, "Error creating rule");
      res.status(500).json({ error: "Failed to create rule" });
    }
  });

  // Update existing compliance rule
  app.put("/api/admin/rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = createRuleSchema.parse(req.body);

      const [updatedRule] = await db.update(complianceRules)
        .set({
          ...validatedData,
          effectiveFrom: validatedData.effectiveFrom,
          updatedAt: new Date(),
        })
        .where(eq(complianceRules.id, id))
        .returning();

      if (!updatedRule) {
        return res.status(404).json({ error: "Rule not found" });
      }

      res.json({ rule: updatedRule });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      logger.error({ error }, "Error updating rule");
      res.status(500).json({ error: "Failed to update rule" });
    }
  });

  // Publish compliance rule
  app.post("/api/admin/rules/:id/publish", async (req, res) => {
    try {
      const { id } = req.params;

      const [publishedRule] = await db.update(complianceRules)
        .set({
          status: 'published',
          updatedAt: new Date(),
        })
        .where(eq(complianceRules.id, id))
        .returning();

      if (!publishedRule) {
        return res.status(404).json({ error: "Rule not found" });
      }

      res.json({ rule: publishedRule, message: "Rule published successfully" });
    } catch (error) {
      logger.error({ error }, "Error publishing rule");
      res.status(500).json({ error: "Failed to publish rule" });
    }
  });

  // Get rule versions by country
  app.get("/api/admin/rules/versions", async (req, res) => {
    try {
      const country = req.query.country as string;
      
      if (!country) {
        return res.status(400).json({ error: "Country parameter required" });
      }

      // Find country by ISO
      const [countryRecord] = await db
        .select()
        .from(countries)
        .where(eq(countries.iso, country.toUpperCase()))
        .limit(1);

      if (!countryRecord) {
        return res.status(404).json({ error: "Country not found" });
      }

      // Get all versions of rules for this country
      const versions = await db
        .select({
          id: complianceRules.id,
          ruleType: complianceRules.ruleType,
          description: complianceRules.description,
          severity: complianceRules.severity,
          version: complianceRules.version,
          status: complianceRules.status,
          effectiveFrom: complianceRules.effectiveFrom,
          updatedAt: complianceRules.updatedAt
        })
        .from(complianceRules)
        .where(eq(complianceRules.countryId, countryRecord.id))
        .orderBy(desc(complianceRules.version));

      res.json({
        country: countryRecord,
        versions,
        total: versions.length
      });
    } catch (error) {
      logger.error({ error }, "Error fetching rule versions");
      res.status(500).json({ error: "Failed to fetch rule versions" });
    }
  });

  const httpServer = createServer(app);
  // Admin compliance rules endpoints
  app.get("/api/admin/compliance-rules", async (req, res) => {
    try {
      // Mock compliance rules data
      const rules = [
        {
          id: "rule-1",
          title: "US Employment Law Compliance",
          description: "Ensures contractor agreements comply with US federal employment regulations",
          version: 1,
          status: "published",
          createdAt: "2024-12-01T00:00:00Z",
          updatedAt: "2024-12-01T00:00:00Z"
        },
        {
          id: "rule-2", 
          title: "GDPR Data Protection",
          description: "Mandatory data protection compliance for EU contractors",
          version: 2,
          status: "published",
          createdAt: "2024-11-15T00:00:00Z",
          updatedAt: "2024-12-10T00:00:00Z"
        },
        {
          id: "rule-3",
          title: "Sanctions Screening Protocol",
          description: "Enhanced sanctions and PEP screening requirements",
          version: 1,
          status: "draft",
          createdAt: "2024-12-14T00:00:00Z",
          updatedAt: "2024-12-14T00:00:00Z"
        }
      ];
      res.json(rules);
    } catch (error) {
      logger.error({ error }, "Error fetching compliance rules");
      res.status(500).json({ error: "Failed to fetch compliance rules" });
    }
  });

  app.post("/api/admin/compliance-rules", async (req, res) => {
    try {
      const { title, description } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ error: "Title and description are required" });
      }

      // Mock rule creation
      const newRule = {
        id: `rule-${Date.now()}`,
        title,
        description,
        version: 1,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await analyticsService.trackEvent({
        event: "admin_rule_publish",
        metadata: { ruleId: newRule.id, title }
      });
      res.status(201).json(newRule);
    } catch (error) {
      logger.error({ error }, "Error creating compliance rule");
      res.status(500).json({ error: "Failed to create compliance rule" });
    }
  });

  app.post("/api/admin/compliance-rules/:id/publish", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Mock publishing logic
      const publishedRule = {
        id,
        status: "published",
        publishedAt: new Date().toISOString()
      };

      await analyticsService.trackEvent({
        event: "admin_rule_publish", 
        metadata: { ruleId: id }
      });
      res.json(publishedRule);
    } catch (error) {
      logger.error({ error }, "Error publishing compliance rule");
      res.status(500).json({ error: "Failed to publish compliance rule" });
    }
  });

  return httpServer;
}