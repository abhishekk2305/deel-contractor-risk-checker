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
import { ruleTemplateService } from "./services/rule-template-service";
import { bulkImportService } from "./services/bulk-import-service";
import { collaborationService } from "./services/collaboration-service";
import { externalDataService } from "./services/external-data-service";
import { auditService } from "./services/audit-service";
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

  // ============ ADVANCED COMPLIANCE FEATURES ============

  // Rule Templates API
  app.get('/api/admin/rule-templates',
    authenticateToken,
    requireAdmin,
    adminRateLimit,
    asyncHandler(async (req, res) => {
      const { category, region, search, isActive } = req.query as any;
      const templates = await ruleTemplateService.getTemplates({
        category,
        region,
        search,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });
      res.json(templates);
    })
  );

  app.get('/api/admin/rule-templates/categories',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const categories = await ruleTemplateService.getTemplateCategories();
      res.json(categories);
    })
  );

  app.get('/api/admin/rule-templates/by-category',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const templatesByCategory = await ruleTemplateService.getTemplatesByCategory();
      res.json(templatesByCategory);
    })
  );

  app.post('/api/admin/rule-templates',
    authenticateToken,
    requireAdmin,
    adminRateLimit,
    validateBody(z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      category: z.enum(['tax', 'employment', 'data_privacy', 'financial', 'regulatory']),
      templateFields: z.array(z.object({
        name: z.string(),
        label: z.string(),
        type: z.enum(['text', 'number', 'date', 'select', 'boolean', 'textarea']),
        required: z.boolean(),
        options: z.array(z.string()).optional(),
        defaultValue: z.any().optional(),
        validation: z.object({
          min: z.number().optional(),
          max: z.number().optional(),
          pattern: z.string().optional(),
        }).optional(),
      })),
      defaultSeverity: z.number().min(1).max(10).default(5),
      applicableRegions: z.array(z.string()).default([]),
      sourceType: z.enum(['internal', 'legal_framework', 'best_practice']).default('internal'),
      tags: z.array(z.string()).default([]),
    })),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const template = await ruleTemplateService.createTemplate({
        ...req.body,
        createdBy: req.user!.id,
      });
      
      // Audit log
      await auditService.createAuditEntry({
        actor: req.user!.id,
        actorRole: req.user!.role,
        action: 'create',
        entity: 'rule_template',
        entityId: template.id,
        newValues: template,
        changesSummary: `Created rule template: ${template.name}`,
        riskLevel: 'low',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        sessionId: req.sessionID,
      });

      res.status(201).json(template);
    })
  );

  app.post('/api/admin/rule-templates/:id/create-rule',
    authenticateToken,
    requireAdmin,
    adminRateLimit,
    validateParams(z.object({ id: z.string().uuid() })),
    validateBody(z.object({
      countryId: z.string().uuid(),
      fieldValues: z.record(z.any()),
    })),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const rule = await ruleTemplateService.createRuleFromTemplate({
        templateId: req.params.id,
        countryId: req.body.countryId,
        fieldValues: req.body.fieldValues,
        createdBy: req.user!.id,
      });

      res.status(201).json(rule);
    })
  );

  // Bulk Import API
  app.get('/api/admin/bulk-imports',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const jobs = await bulkImportService.getImportJobs(req.user!.id);
      res.json(jobs);
    })
  );

  app.get('/api/admin/bulk-imports/template/:type',
    authenticateToken,
    requireAdmin,
    validateParams(z.object({ type: z.enum(['rules', 'templates']) })),
    asyncHandler(async (req, res) => {
      const template = await bulkImportService.getImportTemplate(req.params.type as any);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-template.csv"`);
      res.send(template);
    })
  );

  app.post('/api/admin/bulk-imports',
    authenticateToken,
    requireAdmin,
    adminRateLimit,
    validateBody(z.object({
      fileName: z.string(),
      fileSize: z.number(),
      totalRows: z.number(),
      importType: z.enum(['rules', 'templates', 'countries']),
      csvContent: z.string(),
    })),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const job = await bulkImportService.createImportJob({
        fileName: req.body.fileName,
        fileSize: req.body.fileSize,
        totalRows: req.body.totalRows,
        importType: req.body.importType,
        uploadedBy: req.user!.id,
      });

      // Process import in background
      if (req.body.importType === 'rules') {
        bulkImportService.processRulesImport(job.id, req.body.csvContent).catch(err => {
          logger.error({ error: err, jobId: job.id }, 'Background rules import failed');
        });
      } else if (req.body.importType === 'templates') {
        bulkImportService.processTemplatesImport(job.id, req.body.csvContent).catch(err => {
          logger.error({ error: err, jobId: job.id }, 'Background templates import failed');
        });
      }

      res.status(201).json(job);
    })
  );

  app.get('/api/admin/bulk-imports/:id',
    authenticateToken,
    requireAdmin,
    validateParams(z.object({ id: z.string().uuid() })),
    asyncHandler(async (req, res) => {
      const job = await bulkImportService.getImportJob(req.params.id);
      if (!job) {
        throw new NotFoundError('Import job not found');
      }
      res.json(job);
    })
  );

  // Collaboration API
  app.get('/api/admin/collaboration/sessions',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const { status, entityType, participantId } = req.query as any;
      const sessions = await collaborationService.getSessions({
        status,
        entityType,
        participantId: participantId || req.user!.id,
      });
      res.json(sessions);
    })
  );

  app.post('/api/admin/collaboration/sessions',
    authenticateToken,
    requireAdmin,
    adminRateLimit,
    validateBody(z.object({
      entityType: z.enum(['rule', 'template', 'assessment']),
      entityId: z.string().uuid(),
      sessionTitle: z.string().min(1),
      description: z.string().optional(),
      participants: z.array(z.string().uuid()).default([]),
    })),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const session = await collaborationService.createSession({
        ...req.body,
        moderatorId: req.user!.id,
      });
      res.status(201).json(session);
    })
  );

  app.get('/api/admin/collaboration/sessions/:id',
    authenticateToken,
    requireAdmin,
    validateParams(z.object({ id: z.string().uuid() })),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const session = await collaborationService.getSession(req.params.id);
      if (!session) {
        throw new NotFoundError('Collaboration session not found');
      }
      res.json(session);
    })
  );

  app.get('/api/admin/collaboration/sessions/:id/messages',
    authenticateToken,
    requireAdmin,
    validateParams(z.object({ id: z.string().uuid() })),
    asyncHandler(async (req, res) => {
      const { messageType, isResolved, limit, offset } = req.query as any;
      const messages = await collaborationService.getMessages({
        sessionId: req.params.id,
        messageType,
        isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
      }, limit || 50, offset || 0);
      res.json(messages);
    })
  );

  app.post('/api/admin/collaboration/sessions/:id/messages',
    authenticateToken,
    requireAdmin,
    adminRateLimit,
    validateParams(z.object({ id: z.string().uuid() })),
    validateBody(z.object({
      messageType: z.enum(['comment', 'suggestion', 'approval', 'rejection']),
      content: z.string().min(1),
      metadata: z.record(z.any()).optional(),
    })),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const message = await collaborationService.addMessage({
        sessionId: req.params.id,
        userId: req.user!.id,
        messageType: req.body.messageType,
        content: req.body.content,
        metadata: req.body.metadata || {},
      });
      res.status(201).json(message);
    })
  );

  // External Data Sources API
  app.get('/api/admin/external-data-sources',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const { provider, country, isActive } = req.query as any;
      const sources = await externalDataService.getDataSources({
        provider,
        country,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });
      res.json(sources);
    })
  );

  app.post('/api/admin/external-data-sources/sync',
    authenticateToken,
    requireAdmin,
    adminRateLimit,
    asyncHandler(async (req, res) => {
      const result = await externalDataService.syncAllDataSources();
      res.json(result);
    })
  );

  app.get('/api/risk-data/:country',
    optionalAuth,
    validateParams(z.object({ country: z.string().length(2) })),
    asyncHandler(async (req, res) => {
      const { dataTypes } = req.query as any;
      const riskData = await externalDataService.getRiskData(
        req.params.country,
        dataTypes ? dataTypes.split(',') : undefined
      );
      res.json(riskData);
    })
  );

  // Audit Trail API
  app.get('/api/admin/audit-trail',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const { 
        actor, action, entity, entityId, riskLevel, 
        approvalStatus, fromDate, toDate, requiresApproval,
        limit, offset 
      } = req.query as any;
      
      const result = await auditService.getAuditTrail({
        actor,
        action,
        entity,
        entityId,
        riskLevel,
        approvalStatus,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        requiresApproval: requiresApproval !== undefined ? requiresApproval === 'true' : undefined,
      }, limit || 100, offset || 0);
      
      res.json(result);
    })
  );

  app.get('/api/admin/audit-trail/statistics',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const { fromDate, toDate } = req.query as any;
      const stats = await auditService.getAuditStatistics(
        fromDate ? new Date(fromDate) : undefined,
        toDate ? new Date(toDate) : undefined
      );
      res.json(stats);
    })
  );

  app.post('/api/admin/audit-trail/:id/approve',
    authenticateToken,
    requireAdmin,
    adminRateLimit,
    validateParams(z.object({ id: z.string().uuid() })),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const approved = await auditService.approveAuditEntry(req.params.id, req.user!.id);
      res.json(approved);
    })
  );

  app.post('/api/admin/audit-trail/:id/reject',
    authenticateToken,
    requireAdmin,
    adminRateLimit,
    validateParams(z.object({ id: z.string().uuid() })),
    validateBody(z.object({
      reason: z.string().min(1),
    })),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const rejected = await auditService.rejectAuditEntry(
        req.params.id, 
        req.user!.id, 
        req.body.reason
      );
      res.json(rejected);
    })
  );

  // Approval Workflow API
  app.get('/api/admin/approval-workflows',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const { entityType, isActive } = req.query as any;
      const workflows = await auditService.getWorkflows(
        entityType,
        isActive !== undefined ? isActive === 'true' : undefined
      );
      res.json(workflows);
    })
  );

  app.get('/api/admin/approval-requests',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const { status, entityType, workflowId } = req.query as any;
      const requests = await auditService.getApprovalRequests({
        status,
        entityType,
        requestedBy: req.user!.role === 'admin' ? undefined : req.user!.id,
        workflowId,
      });
      res.json(requests);
    })
  );

  app.post('/api/admin/approval-requests/:id/process',
    authenticateToken,
    requireAdmin,
    adminRateLimit,
    validateParams(z.object({ id: z.string().uuid() })),
    validateBody(z.object({
      action: z.enum(['approve', 'reject']),
      comments: z.string().optional(),
    })),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const processed = await auditService.processApprovalRequest(
        req.params.id,
        req.user!.id,
        req.body.action,
        req.body.comments
      );
      res.json(processed);
    })
  );

  // Error handling middleware (must be last)
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
