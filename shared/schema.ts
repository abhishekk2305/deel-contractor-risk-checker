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
  role: text("role").notNull().default("user"), // 'admin' | 'user'
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
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
