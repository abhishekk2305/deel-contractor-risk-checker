import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { eq, desc, asc, like, and, or } from "drizzle-orm";
import { 
  countries, 
  contractors, 
  riskScores, 
  complianceRules, 
  pdfReports,
  auditLogs,
  users,
  riskCheckRequestSchema,
  insertComplianceRuleSchema,
  insertContractorSchema,
  insertRiskScoreSchema
} from "@shared/schema";
import { storage } from "./storage";
import { authenticateToken, requireAdmin, optionalAuth, AuthenticatedRequest } from "./middleware/auth";
import { generalRateLimit, riskCheckRateLimit, pdfRateLimit, adminRateLimit } from "./middleware/rate-limit";
import { validateBody, validateQuery, validateParams, countrySearchSchema, analyticsQuerySchema } from "./middleware/validation";
import { errorHandler, asyncHandler, NotFoundError, BadRequestError } from "./middleware/error-handler";
import { riskEngine } from "./services/risk-engine";
import { pdfGenerator } from "./services/pdf-generator";
import { externalApis } from "./services/external-apis";
import { notificationService } from "./services/notifications";
import { pdfQueue } from "./lib/redis";
import { createChildLogger } from "./lib/logger";

const logger = createChildLogger('routes');

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Apply general rate limiting to all API routes
  app.use('/api', generalRateLimit);

  // Countries API
  app.get('/api/countries', 
    optionalAuth,
    validateQuery(countrySearchSchema),
    asyncHandler(async (req, res) => {
      const { query, type, payment, risk, page, page_size, sort } = req.query as any;
      
      const result = await storage.searchCountries({
        query,
        contractorType: type,
        paymentMethod: payment,
        riskLevel: risk,
        page,
        pageSize: page_size,
        sort,
      });

      res.json(result);
    })
  );

  app.get('/api/countries/featured',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const featured = await storage.getFeaturedCountries();
      res.json(featured);
    })
  );

  app.get('/api/countries/:iso',
    optionalAuth,
    validateParams(z.object({ iso: z.string().length(2) })),
    asyncHandler(async (req, res) => {
      const country = await storage.getCountryByIso(req.params.iso);
      if (!country) {
        throw new NotFoundError('Country not found');
      }
      res.json(country);
    })
  );

  // Risk Assessment API
  app.post('/api/risk-check',
    optionalAuth,
    riskCheckRateLimit,
    validateBody(riskCheckRequestSchema),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const { contractorName, countryIso, contractorType, paymentMethod, registrationId } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;

      // Check for idempotency
      if (idempotencyKey) {
        const existing = await storage.getRiskCheckByIdempotencyKey(idempotencyKey);
        if (existing) {
          return res.json(existing);
        }
      }

      // Get country
      const country = await storage.getCountryByIso(countryIso);
      if (!country) {
        throw new NotFoundError('Country not found');
      }

      // Create contractor record
      const contractor = await storage.createContractor({
        name: contractorName,
        countryId: country.id,
        type: contractorType,
        paymentMethod,
        registrationId,
      });

      // Run risk assessment
      const assessment = await riskEngine.assessRisk({
        contractorId: contractor.id,
        countryIso,
        contractorType,
        paymentMethod,
        registrationId,
        contractorName,
      });

      // Store risk score
      const riskScore = await storage.createRiskScore({
        contractorId: contractor.id,
        score: assessment.score,
        tier: assessment.tier,
        topRisks: assessment.topRisks,
        recommendations: assessment.recommendations,
        penaltyRange: assessment.penaltyRange,
        partialSources: assessment.partialSources,
        rulesetVersion: assessment.rulesetVersion,
        breakdown: assessment.breakdown,
      });

      // Store idempotency key if provided
      if (idempotencyKey) {
        await storage.storeIdempotencyKey(idempotencyKey, assessment);
      }

      res.json(assessment);
    })
  );

  // PDF Reports API
  app.post('/api/pdf-report',
    optionalAuth,
    pdfRateLimit,
    validateBody(z.object({ contractorId: z.string().uuid() })),
    asyncHandler(async (req, res) => {
      const { contractorId } = req.body;

      // Verify contractor exists
      const contractor = await storage.getContractor(contractorId);
      if (!contractor) {
        throw new NotFoundError('Contractor not found');
      }

      // Queue PDF generation job
      const jobId = await pdfQueue.addJob('pdf.generate', { contractorId });

      res.status(202).json({ jobId });
    })
  );

  app.get('/api/pdf-report/:jobId',
    optionalAuth,
    validateParams(z.object({ jobId: z.string() })),
    asyncHandler(async (req, res) => {
      const job = await pdfQueue.getJob(req.params.jobId);
      
      if (!job) {
        throw new NotFoundError('Job not found');
      }

      let response = {
        status: job.status,
        ...(job.result && { 
          url: job.result.url,
          sizeBytes: job.result.sizeBytes 
        })
      };

      res.json(response);
    })
  );

  // Admin API
  app.use('/api/admin', authenticateToken, requireAdmin, adminRateLimit);

  app.get('/api/admin/rules',
    validateQuery(z.object({
      country: z.string().optional(),
      status: z.enum(['draft', 'published']).optional(),
    })),
    asyncHandler(async (req, res) => {
      const { country, status } = req.query as any;
      const rules = await storage.getComplianceRules({ countryIso: country, status });
      res.json(rules);
    })
  );

  app.post('/api/admin/rules',
    validateBody(insertComplianceRuleSchema),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const rule = await storage.createComplianceRule(req.body);
      
      // Audit log
      await storage.createAuditLog({
        actor: req.user!.username,
        action: 'create',
        entity: 'compliance_rule',
        entityId: rule.id,
        diff: { created: req.body },
      });

      res.status(201).json(rule);
    })
  );

  app.put('/api/admin/rules/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    validateBody(insertComplianceRuleSchema.partial()),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const { id } = req.params;
      const existing = await storage.getComplianceRule(id);
      
      if (!existing) {
        throw new NotFoundError('Rule not found');
      }

      const updated = await storage.updateComplianceRule(id, req.body);

      // Audit log
      await storage.createAuditLog({
        actor: req.user!.username,
        action: 'update',
        entity: 'compliance_rule',
        entityId: id,
        diff: { before: existing, after: updated },
      });

      res.json(updated);
    })
  );

  app.post('/api/admin/rules/:id/publish',
    validateParams(z.object({ id: z.string().uuid() })),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const { id } = req.params;
      const rule = await storage.getComplianceRule(id);
      
      if (!rule) {
        throw new NotFoundError('Rule not found');
      }

      const result = await storage.publishRule(id, req.user!.username);

      // Audit log
      await storage.createAuditLog({
        actor: req.user!.username,
        action: 'publish',
        entity: 'compliance_rule',
        entityId: id,
        diff: { rulesetVersion: result.rulesetVersion },
      });

      res.json(result);
    })
  );

  app.delete('/api/admin/rules/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const { id } = req.params;
      const rule = await storage.getComplianceRule(id);
      
      if (!rule) {
        throw new NotFoundError('Rule not found');
      }

      if (rule.status === 'published') {
        throw new BadRequestError('Cannot delete published rules');
      }

      await storage.deleteComplianceRule(id);

      // Audit log
      await storage.createAuditLog({
        actor: req.user!.username,
        action: 'delete',
        entity: 'compliance_rule',
        entityId: id,
        diff: { deleted: rule },
      });

      res.status(204).send();
    })
  );

  app.get('/api/admin/analytics',
    validateQuery(analyticsQuerySchema),
    asyncHandler(async (req, res) => {
      const { from, to } = req.query as any;
      const analytics = await storage.getAnalytics({ from, to });
      res.json(analytics);
    })
  );

  // Authentication API (for completeness)
  app.post('/api/auth/login',
    validateBody(z.object({
      username: z.string(),
      password: z.string(),
    })),
    asyncHandler(async (req, res) => {
      // TODO: Implement proper authentication
      // For now, return a mock user
      res.json({
        id: 'user-1',
        username: req.body.username,
        email: `${req.body.username}@deel.com`,
        role: 'admin',
      });
    })
  );

  app.get('/api/auth/me',
    authenticateToken,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      res.json(req.user);
    })
  );

  app.post('/api/auth/logout',
    asyncHandler(async (req, res) => {
      res.json({ message: 'Logged out successfully' });
    })
  );

  // Error handling middleware (must be last)
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
