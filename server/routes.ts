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
  // Enable trust proxy for accurate rate limiting
  app.set('trust proxy', true);
  
  // Apply metrics middleware globally
  app.use(metricsMiddleware);
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    trustProxy: true
  });

  app.use("/api", limiter);

  // Health and monitoring endpoints
  app.get("/health", healthCheck);
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
      const search = req.query.search as string || "";

      // Track search event
      await analyticsService.trackEvent({
        event: 'search_submit',
        metadata: { search, page }
      });

      let query = db.select().from(countries);

      if (search) {
        query = query.where(
          or(
            ilike(countries.name, `%${search}%`),
            ilike(countries.iso, `%${search}%`)
          )
        );
      }

      const offset = (page - 1) * limit;
      const results = await query.limit(limit).offset(offset).orderBy(countries.name);

      // Get total count for pagination
      let totalQuery = db.select({ count: count() }).from(countries);
      if (search) {
        totalQuery = totalQuery.where(
          or(
            ilike(countries.name, `%${search}%`),
            ilike(countries.iso, `%${search}%`)
          )
        );
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

      // Generate mock risk assessment
      const overallScore = Math.floor(Math.random() * 40) + 30; // 30-70 range
      const riskTier = overallScore >= 60 ? 'high' : overallScore >= 40 ? 'medium' : 'low';
      
      const topRisks = [
        'Standard compliance requirements',
        `${country.name} regulatory environment`,
        'Cross-border payment considerations'
      ];

      const recommendations = [
        'Review local employment laws',
        'Ensure proper tax compliance',
        'Maintain updated contractor agreements'
      ];

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

      res.json({
        success: true,
        result: {
          id: riskScore.id,
          contractorId: contractor.id,
          overallScore: overallScore,
          riskTier: riskTier,
          topRisks: topRisks,
          recommendations: recommendations,
          penaltyRange: `$5,000 - $50,000`,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
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
      const jobId = await pdfService.enqueuePDFGeneration({
        contractorName: contractor?.name || 'Unknown',
        countryName: country?.name || 'Unknown',
        riskAssessment: {
          id: riskScore.id,
          contractorId: riskScore.contractorId,
          overallScore: riskScore.score,
          riskTier: riskScore.tier,
          topRisks: riskScore.topRisks as string[],
          recommendations: riskScore.recommendations as string[]
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

  const httpServer = createServer(app);
  return httpServer;
}