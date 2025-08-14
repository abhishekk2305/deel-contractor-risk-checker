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
import { createChildLogger } from "./lib/logger";

const logger = createChildLogger('routes');

export function registerRoutes(app: Express) {
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later."
  });

  const riskCheckLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 risk checks per minute
    message: "Too many risk checks, please wait before retrying."
  });

  app.use("/api", limiter);

  // Health check endpoint
  app.get("/health", async (req, res) => {
    try {
      const healthStatus = await analyticsService.getHealthStatus();
      res.status(healthStatus.status === 'healthy' ? 200 : 503).json({
        status: healthStatus.status,
        timestamp: new Date().toISOString(),
        checks: healthStatus.checks,
        version: "1.0.0"
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed"
      });
    }
  });

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

  // Countries API
  app.get("/api/countries", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || "";
      const riskLevel = req.query.riskLevel as string;
      const region = req.query.region as string;

      // Track search event
      await analyticsService.trackEvent({
        event: 'search_submit',
        metadata: { search, riskLevel, region, page }
      });

      let query = db.select().from(countries);
      let conditions = [];

      if (search) {
        conditions.push(
          or(
            ilike(countries.name, `%${search}%`),
            ilike(countries.iso, `%${search}%`)
          )
        );
      }

      if (riskLevel) {
        conditions.push(eq(countries.riskLevel, riskLevel as any));
      }

      if (region) {
        conditions.push(eq(countries.region, region));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const offset = (page - 1) * limit;
      const results = await query.limit(limit).offset(offset).orderBy(countries.name);

      // Get total count for pagination
      const totalQuery = db.select({ count: count() }).from(countries);
      if (conditions.length > 0) {
        totalQuery.where(and(...conditions));
      }
      const [{ count: total }] = await totalQuery;

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

  // Get featured countries
  app.get("/api/countries/featured", async (req, res) => {
    try {
      const featuredCountries = await db
        .select()
        .from(countries)
        .where(eq(countries.featured, true))
        .limit(6)
        .orderBy(countries.complianceScore);

      res.json({ countries: featuredCountries });
    } catch (error) {
      logger.error({ error }, "Error fetching featured countries");
      res.status(500).json({ error: "Failed to fetch featured countries" });
    }
  });

  // Get country by ISO code
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

  // Risk check endpoint
  const riskCheckSchema = z.object({
    contractorName: z.string().min(1, "Contractor name is required"),
    contractorEmail: z.string().email().optional(),
    countryIso: z.string().length(2, "Country ISO must be 2 characters"),
    contractorType: z.enum(['employee', 'contractor', 'freelancer']),
    idempotencyKey: z.string().optional(),
  });

  app.post("/api/risk-check", riskCheckLimiter, async (req, res) => {
    try {
      const validatedData = riskCheckSchema.parse(req.body);
      
      logger.info({ 
        contractor: validatedData.contractorName, 
        country: validatedData.countryIso 
      }, 'Starting risk check');

      const result = await enhancedRiskEngine.performRiskCheck(validatedData);

      // Track successful risk check
      await analyticsService.trackEvent({
        event: 'risk_check_success',
        metadata: {
          contractorName: validatedData.contractorName,
          countryIso: validatedData.countryIso,
          riskTier: result.riskTier,
          overallScore: result.overallScore,
          partialResults: result.partialResults
        }
      });

      res.json({
        success: true,
        result: {
          id: result.id,
          contractorId: result.contractorId,
          overallScore: result.overallScore,
          riskTier: result.riskTier,
          topRisks: result.topRisks,
          recommendations: result.recommendations,
          penaltyRange: result.penaltyRange,
          partialResults: result.partialResults,
          failedSources: result.failedSources,
          generatedAt: result.generatedAt,
          expiresAt: result.expiresAt
        },
        ...(result.partialResults && {
          warning: `Partial results: ${result.failedSources.join(', ')} data sources unavailable`
        })
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

  // PDF generation endpoints
  app.post("/api/pdf/generate", async (req, res) => {
    try {
      const { riskAssessmentId } = req.body;

      if (!riskAssessmentId) {
        return res.status(400).json({ error: "Risk assessment ID is required" });
      }

      // Get risk assessment from database
      const [riskScore] = await db
        .select()
        .from(riskScores)
        .where(eq(riskScores.id, riskAssessmentId))
        .limit(1);

      if (!riskScore) {
        return res.status(404).json({ error: "Risk assessment not found" });
      }

      // Get contractor and country info
      const [contractor] = await db
        .select()
        .from(contractors)
        .where(eq(contractors.id, riskScore.contractorId))
        .limit(1);

      const [country] = await db
        .select()
        .from(countries)
        .where(eq(countries.iso, contractor?.countryIso || ''))
        .limit(1);

      // Track PDF generation
      await analyticsService.trackEvent({
        event: 'pdf_generate',
        metadata: {
          contractorId: riskScore.contractorId,
          contractorName: contractor?.name,
          riskTier: riskScore.riskTier
        }
      });

      // Enqueue PDF generation
      const jobId = await pdfService.enqueuePDFGeneration({
        contractorName: contractor?.name || 'Unknown',
        countryName: country?.name || 'Unknown',
        riskAssessment: {
          id: riskScore.id,
          contractorId: riskScore.contractorId,
          overallScore: riskScore.overallScore,
          riskTier: riskScore.riskTier,
          topRisks: (riskScore.details as any)?.topRisks || [],
          recommendations: (riskScore.details as any)?.recommendations || [],
          penaltyRange: (riskScore.details as any)?.penaltyRange || { min: 0, max: 0, currency: 'USD' },
          sourceResults: (riskScore.details as any)?.sourceResults || {},
          partialResults: (riskScore.details as any)?.partialResults || false,
          failedSources: (riskScore.details as any)?.failedSources || []
        }
      });

      res.json({
        success: true,
        jobId,
        message: "PDF generation started"
      });
    } catch (error) {
      logger.error({ error }, 'PDF generation failed');
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Get PDF job status
  app.get("/api/pdf/status/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const status = await pdfService.getJobStatus(jobId);

      if (!status) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Track PDF download success
      if (status.status === 'completed' && req.query.downloaded === 'true') {
        await analyticsService.trackEvent({
          event: 'pdf_download_success',
          metadata: {
            jobId,
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

  // Admin CMS - Compliance Rules
  app.get("/api/admin/rules", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const countryIso = req.query.countryIso as string;

      let query = db
        .select({
          id: complianceRules.id,
          countryId: complianceRules.countryId,
          title: complianceRules.title,
          description: complianceRules.description,
          ruleType: complianceRules.ruleType,
          category: complianceRules.category,
          severity: complianceRules.severity,
          status: complianceRules.status,
          version: complianceRules.version,
          effectiveFrom: complianceRules.effectiveFrom,
          effectiveTo: complianceRules.effectiveTo,
          lastUpdated: complianceRules.lastUpdated,
          country: {
            name: countries.name,
            iso: countries.iso
          }
        })
        .from(complianceRules)
        .leftJoin(countries, eq(complianceRules.countryId, countries.id));

      let conditions = [];

      if (status) {
        conditions.push(eq(complianceRules.status, status as any));
      }

      if (countryIso) {
        conditions.push(eq(countries.iso, countryIso.toUpperCase()));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const offset = (page - 1) * limit;
      const results = await query
        .limit(limit)
        .offset(offset)
        .orderBy(desc(complianceRules.lastUpdated));

      // Get total count
      let countQuery = db.select({ count: count() }).from(complianceRules);
      if (countryIso) {
        countQuery = countQuery
          .leftJoin(countries, eq(complianceRules.countryId, countries.id))
          .where(eq(countries.iso, countryIso.toUpperCase()));
      }
      if (status) {
        countQuery = countQuery.where(eq(complianceRules.status, status as any));
      }

      const [{ count: total }] = await countQuery;

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

  // Create new compliance rule
  const createRuleSchema = z.object({
    countryId: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().min(1),
    ruleType: z.enum(['classification', 'tax', 'privacy', 'labor', 'other']),
    category: z.enum(['employment', 'tax', 'data_privacy', 'labor_law', 'other']),
    severity: z.number().min(1).max(10),
    requirements: z.array(z.string()),
    penalties: z.string(),
    source: z.string(),
    effectiveFrom: z.string().transform(str => new Date(str)),
    effectiveTo: z.string().transform(str => new Date(str)).optional(),
  });

  app.post("/api/admin/rules", async (req, res) => {
    try {
      const validatedData = createRuleSchema.parse(req.body);

      const [newRule] = await db.insert(complianceRules).values({
        ...validatedData,
        status: 'draft',
        version: 1,
        lastUpdated: new Date(),
      }).returning();

      // Log audit event
      await db.insert(auditLogs).values({
        action: 'create_rule',
        entityType: 'compliance_rule',
        entityId: newRule.id,
        userId: 'admin', // In real app, get from auth
        details: { ruleTitle: validatedData.title },
        timestamp: new Date(),
      });

      res.status(201).json({ rule: newRule });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      logger.error({ error }, "Error creating rule");
      res.status(500).json({ error: "Failed to create rule" });
    }
  });

  // Publish compliance rule
  app.post("/api/admin/rules/:id/publish", async (req, res) => {
    try {
      const { id } = req.params;

      const [updatedRule] = await db
        .update(complianceRules)
        .set({
          status: 'published',
          version: sql`${complianceRules.version} + 1`,
          lastUpdated: new Date(),
        })
        .where(eq(complianceRules.id, id))
        .returning();

      if (!updatedRule) {
        return res.status(404).json({ error: "Rule not found" });
      }

      // Track rule publish
      await analyticsService.trackEvent({
        event: 'admin_rule_publish',
        metadata: {
          ruleId: id,
          ruleTitle: updatedRule.title,
          version: updatedRule.version
        }
      });

      // Log audit event
      await db.insert(auditLogs).values({
        action: 'publish_rule',
        entityType: 'compliance_rule',
        entityId: id,
        userId: 'admin',
        details: { 
          ruleTitle: updatedRule.title,
          version: updatedRule.version 
        },
        timestamp: new Date(),
      });

      res.json({ rule: updatedRule, message: "Rule published successfully" });
    } catch (error) {
      logger.error({ error }, "Error publishing rule");
      res.status(500).json({ error: "Failed to publish rule" });
    }
  });

  // Get rule version history
  app.get("/api/admin/rules/:id/history", async (req, res) => {
    try {
      const { id } = req.params;

      const history = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'compliance_rule'),
            eq(auditLogs.entityId, id)
          )
        )
        .orderBy(desc(auditLogs.timestamp));

      res.json({ history });
    } catch (error) {
      logger.error({ error }, "Error fetching rule history");
      res.status(500).json({ error: "Failed to fetch rule history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}