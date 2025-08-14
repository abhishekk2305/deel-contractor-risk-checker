import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, date, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Countries table
export const countries = pgTable("countries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  iso: varchar("iso", { length: 3 }).notNull().unique(),
  name: text("name").notNull(),
  flag: text("flag"),
  lastUpdated: timestamp("last_updated").notNull().default(sql`now()`),
});

// Compliance rules table
export const complianceRules = pgTable("compliance_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  countryId: uuid("country_id").references(() => countries.id).notNull(),
  ruleType: text("rule_type").notNull(),
  description: text("description").notNull(),
  severity: integer("severity").notNull(), // 1-10 scale
  effectiveFrom: date("effective_from").notNull(),
  sourceUrl: text("source_url"),
  status: text("status").notNull().default("draft"), // 'draft' | 'published'
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Ruleset versions table
export const rulesetVersions = pgTable("ruleset_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  countryId: uuid("country_id").references(() => countries.id).notNull(),
  version: integer("version").notNull(),
  publishedAt: timestamp("published_at").notNull().default(sql`now()`),
  notes: text("notes"),
  publishedBy: text("published_by").notNull(),
});

// Contractors table
export const contractors = pgTable("contractors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  countryId: uuid("country_id").references(() => countries.id).notNull(),
  type: text("type").notNull(), // 'independent' | 'eor' | 'freelancer'
  paymentMethod: text("payment_method").notNull(), // 'wire' | 'ach' | 'crypto' | 'paypal'
  registrationId: text("registration_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Risk scores table
export const riskScores = pgTable("risk_scores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid("contractor_id").references(() => contractors.id).notNull(),
  score: integer("score").notNull(), // 0-100
  tier: text("tier").notNull(), // 'low' | 'medium' | 'high'
  topRisks: jsonb("top_risks").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  penaltyRange: text("penalty_range").notNull(),
  partialSources: jsonb("partial_sources").notNull().default("[]"),
  rulesetVersion: integer("ruleset_version").notNull(),
  breakdown: jsonb("breakdown").notNull(), // Detailed score breakdown
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// PDF reports table
export const pdfReports = pgTable("pdf_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid("contractor_id").references(() => contractors.id).notNull(),
  url: text("url").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  generatedAt: timestamp("generated_at").notNull().default(sql`now()`),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  diff: jsonb("diff"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  countryId: uuid("country_id").references(() => countries.id).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Users table for authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // 'admin' | 'user' | 'compliance_manager' | 'risk_analyst'
  permissions: jsonb("permissions").default("[]"), // Array of specific permissions
  department: text("department"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  lastLoginAt: timestamp("last_login_at"),
});

// Rule templates table for advanced compliance templates
export const ruleTemplates = pgTable("rule_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'tax', 'employment', 'data_privacy', 'financial', 'regulatory'
  templateFields: jsonb("template_fields").notNull(), // JSON schema for dynamic fields
  defaultSeverity: integer("default_severity").notNull().default(5),
  applicableRegions: jsonb("applicable_regions").default("[]"), // Array of region codes
  sourceType: text("source_type").notNull(), // 'internal', 'legal_framework', 'best_practice'
  tags: jsonb("tags").default("[]"),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Bulk import jobs for compliance rules
export const bulkImportJobs = pgTable("bulk_import_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  totalRows: integer("total_rows").notNull(),
  processedRows: integer("processed_rows").default(0),
  successfulRows: integer("successful_rows").default(0),
  failedRows: integer("failed_rows").default(0),
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  validationErrors: jsonb("validation_errors").default("[]"),
  importType: text("import_type").notNull(), // 'rules', 'templates', 'countries'
  uploadedBy: uuid("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
});

// Real-time collaboration sessions
export const collaborationSessions = pgTable("collaboration_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'rule', 'template', 'assessment'
  entityId: uuid("entity_id").notNull(),
  sessionTitle: text("session_title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // 'active', 'concluded', 'archived'
  participants: jsonb("participants").notNull().default("[]"), // Array of user IDs
  moderatorId: uuid("moderator_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  lastActivityAt: timestamp("last_activity_at").notNull().default(sql`now()`),
});

// Collaboration messages/comments
export const collaborationMessages = pgTable("collaboration_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").references(() => collaborationSessions.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  messageType: text("message_type").notNull(), // 'comment', 'suggestion', 'approval', 'rejection'
  content: text("content").notNull(),
  metadata: jsonb("metadata").default("{}"), // Additional data like field references, attachments
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// External risk data sources
export const externalDataSources = pgTable("external_data_sources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // 'world_bank', 'oecd', 'local_regulatory', 'comply_advantage', 'news_api'
  apiEndpoint: text("api_endpoint").notNull(),
  dataType: text("data_type").notNull(), // 'economic_indicators', 'regulatory_updates', 'sanctions', 'political_stability'
  country: varchar("country", { length: 3 }), // ISO country code if country-specific
  refreshFrequency: text("refresh_frequency").notNull(), // 'daily', 'weekly', 'monthly', 'quarterly'
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"), // 'success', 'failed', 'partial'
  apiConfig: jsonb("api_config").notNull(), // API keys, rate limits, etc.
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Enhanced risk data cache
export const riskDataCache = pgTable("risk_data_cache", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dataSourceId: uuid("data_source_id").references(() => externalDataSources.id).notNull(),
  country: varchar("country", { length: 3 }).references(() => countries.iso),
  dataKey: text("data_key").notNull(), // Unique key for the data type
  data: jsonb("data").notNull(),
  score: integer("score"), // Normalized risk score 0-100
  confidence: integer("confidence").default(100), // Confidence level 0-100
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Enhanced audit logs with approval workflows
export const auditTrails = pgTable("audit_trails", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actor: uuid("actor").references(() => users.id).notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'publish', 'approve', 'reject'
  entity: text("entity").notNull(),
  entityId: uuid("entity_id").notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  changesSummary: text("changes_summary"),
  riskLevel: text("risk_level").notNull(), // 'low', 'medium', 'high', 'critical'
  requiresApproval: boolean("requires_approval").default(false),
  approvalStatus: text("approval_status"), // 'pending', 'approved', 'rejected'
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Approval workflows
export const approvalWorkflows = pgTable("approval_workflows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  entityType: text("entity_type").notNull(), // 'rule', 'template', 'bulk_import'
  triggerConditions: jsonb("trigger_conditions").notNull(), // Conditions that trigger this workflow
  approvalSteps: jsonb("approval_steps").notNull(), // Ordered list of approval steps
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Approval requests
export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: uuid("workflow_id").references(() => approvalWorkflows.id).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  requestedBy: uuid("requested_by").references(() => users.id).notNull(),
  currentStep: integer("current_step").default(0),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'cancelled'
  approvalHistory: jsonb("approval_history").default("[]"),
  requestData: jsonb("request_data").notNull(), // The actual data/changes being requested
  priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  deadline: timestamp("deadline"),
  comments: text("comments"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Create insert schemas
export const insertCountrySchema = createInsertSchema(countries).omit({
  id: true,
  lastUpdated: true,
});

export const insertComplianceRuleSchema = createInsertSchema(complianceRules).omit({
  id: true,
  updatedAt: true,
});

export const insertRulesetVersionSchema = createInsertSchema(rulesetVersions).omit({
  id: true,
  publishedAt: true,
});

export const insertContractorSchema = createInsertSchema(contractors).omit({
  id: true,
  createdAt: true,
});

export const insertRiskScoreSchema = createInsertSchema(riskScores).omit({
  id: true,
  createdAt: true,
});

export const insertPdfReportSchema = createInsertSchema(pdfReports).omit({
  id: true,
  generatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

// New table insert schemas
export const insertRuleTemplateSchema = createInsertSchema(ruleTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBulkImportJobSchema = createInsertSchema(bulkImportJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  processedRows: true,
  successfulRows: true,
  failedRows: true,
});

export const insertCollaborationSessionSchema = createInsertSchema(collaborationSessions).omit({
  id: true,
  createdAt: true,
  lastActivityAt: true,
});

export const insertCollaborationMessageSchema = createInsertSchema(collaborationMessages).omit({
  id: true,
  createdAt: true,
});

export const insertExternalDataSourceSchema = createInsertSchema(externalDataSources).omit({
  id: true,
  createdAt: true,
  lastSyncAt: true,
});

export const insertRiskDataCacheSchema = createInsertSchema(riskDataCache).omit({
  id: true,
  createdAt: true,
});

export const insertAuditTrailSchema = createInsertSchema(auditTrails).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});

export const insertApprovalWorkflowSchema = createInsertSchema(approvalWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Risk check request schema
export const riskCheckRequestSchema = z.object({
  contractorName: z.string().optional(),
  countryIso: z.string().length(2),
  contractorType: z.enum(["independent", "eor", "freelancer"]),
  paymentMethod: z.enum(["wire", "ach", "crypto", "paypal"]),
  registrationId: z.string().optional(),
});

// Infer types
export type Country = typeof countries.$inferSelect;
export type InsertCountry = z.infer<typeof insertCountrySchema>;

export type ComplianceRule = typeof complianceRules.$inferSelect;
export type InsertComplianceRule = z.infer<typeof insertComplianceRuleSchema>;

export type RulesetVersion = typeof rulesetVersions.$inferSelect;
export type InsertRulesetVersion = z.infer<typeof insertRulesetVersionSchema>;

export type Contractor = typeof contractors.$inferSelect;
export type InsertContractor = z.infer<typeof insertContractorSchema>;

export type RiskScore = typeof riskScores.$inferSelect;
export type InsertRiskScore = z.infer<typeof insertRiskScoreSchema>;

export type PdfReport = typeof pdfReports.$inferSelect;
export type InsertPdfReport = z.infer<typeof insertPdfReportSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type RuleTemplate = typeof ruleTemplates.$inferSelect;
export type InsertRuleTemplate = z.infer<typeof insertRuleTemplateSchema>;

export type BulkImportJob = typeof bulkImportJobs.$inferSelect;
export type InsertBulkImportJob = z.infer<typeof insertBulkImportJobSchema>;

export type CollaborationSession = typeof collaborationSessions.$inferSelect;
export type InsertCollaborationSession = z.infer<typeof insertCollaborationSessionSchema>;

export type CollaborationMessage = typeof collaborationMessages.$inferSelect;
export type InsertCollaborationMessage = z.infer<typeof insertCollaborationMessageSchema>;

export type ExternalDataSource = typeof externalDataSources.$inferSelect;
export type InsertExternalDataSource = z.infer<typeof insertExternalDataSourceSchema>;

export type RiskDataCache = typeof riskDataCache.$inferSelect;
export type InsertRiskDataCache = z.infer<typeof insertRiskDataCacheSchema>;

export type AuditTrail = typeof auditTrails.$inferSelect;
export type InsertAuditTrail = z.infer<typeof insertAuditTrailSchema>;

export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type InsertApprovalWorkflow = z.infer<typeof insertApprovalWorkflowSchema>;

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;

export type RiskCheckRequest = z.infer<typeof riskCheckRequestSchema>;

// Additional schemas for API responses
export type RiskAssessmentResult = {
  score: number;
  tier: 'low' | 'medium' | 'high';
  topRisks: Array<{
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
  penaltyRange: string;
  partialSources: string[];
  rulesetVersion: number;
  breakdown: {
    sanctions: number;
    pep: number;
    adverseMedia: number;
    internalHistory: number;
    countryBaseline: number;
  };
};

export type CountrySearchResult = Country & {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  topRiskFactors: string[];
};
