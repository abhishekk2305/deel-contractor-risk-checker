import { eq, desc } from "drizzle-orm";
import { db } from "../lib/database";
import {
  bulkImportJobs,
  complianceRules,
  ruleTemplates,
  countries,
  BulkImportJob,
  InsertBulkImportJob,
  InsertComplianceRule,
  InsertRuleTemplate,
} from "@shared/schema";
import { createChildLogger } from "../lib/logger";
import { ruleTemplateService } from "./rule-template-service";
import * as csv from 'csv-parse/sync';

const logger = createChildLogger('bulk-import-service');

interface ImportRow {
  [key: string]: any;
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
  value?: any;
}

interface ImportResult {
  jobId: string;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  errors: ValidationError[];
}

export class BulkImportService {
  async createImportJob(jobData: InsertBulkImportJob): Promise<BulkImportJob> {
    const [created] = await db
      .insert(bulkImportJobs)
      .values(jobData)
      .returning();

    logger.info({ jobId: created.id, fileName: created.fileName }, 'Bulk import job created');
    return created;
  }

  async getImportJob(id: string): Promise<BulkImportJob | undefined> {
    const [job] = await db
      .select()
      .from(bulkImportJobs)
      .where(eq(bulkImportJobs.id, id))
      .limit(1);

    return job;
  }

  async getImportJobs(uploadedBy?: string): Promise<BulkImportJob[]> {
    let query = db
      .select()
      .from(bulkImportJobs);

    if (uploadedBy) {
      query = query.where(eq(bulkImportJobs.uploadedBy, uploadedBy));
    }

    return query.orderBy(desc(bulkImportJobs.createdAt));
  }

  async updateJobStatus(
    jobId: string, 
    status: string, 
    progress?: Partial<Pick<BulkImportJob, 'processedRows' | 'successfulRows' | 'failedRows' | 'validationErrors'>>
  ): Promise<void> {
    const updates: any = { status };
    
    if (progress) {
      Object.assign(updates, progress);
    }
    
    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date();
    }

    await db
      .update(bulkImportJobs)
      .set(updates)
      .where(eq(bulkImportJobs.id, jobId));

    logger.info({ jobId, status }, 'Import job status updated');
  }

  async processRulesImport(jobId: string, csvContent: string): Promise<ImportResult> {
    const job = await this.getImportJob(jobId);
    if (!job) {
      throw new Error('Import job not found');
    }

    await this.updateJobStatus(jobId, 'processing');

    try {
      // Parse CSV content
      const records = csv.parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ImportRow[];

      const totalRows = records.length;
      let processedRows = 0;
      let successfulRows = 0;
      let failedRows = 0;
      const errors: ValidationError[] = [];

      await this.updateJobStatus(jobId, 'processing', {
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        validationErrors: [],
      });

      // Process each row
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNumber = i + 2; // +2 for header and 0-based index

        try {
          // Validate and process the row
          const validatedRule = await this.validateRuleRow(row, rowNumber);
          
          // Create the compliance rule
          await db.insert(complianceRules).values(validatedRule);
          
          successfulRows++;
        } catch (error) {
          failedRows++;
          errors.push({
            row: rowNumber,
            column: 'general',
            message: error instanceof Error ? error.message : 'Unknown error',
            value: row,
          });
        }

        processedRows++;

        // Update progress every 10 rows or on completion
        if (processedRows % 10 === 0 || processedRows === totalRows) {
          await this.updateJobStatus(jobId, 'processing', {
            processedRows,
            successfulRows,
            failedRows,
            validationErrors: errors,
          });
        }
      }

      // Mark as completed
      await this.updateJobStatus(jobId, 'completed', {
        processedRows,
        successfulRows,
        failedRows,
        validationErrors: errors,
      });

      logger.info({ 
        jobId, 
        totalRows, 
        successfulRows, 
        failedRows 
      }, 'Rules import completed');

      return {
        jobId,
        totalRows,
        processedRows,
        successfulRows,
        failedRows,
        errors,
      };

    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', {
        validationErrors: [{
          row: 0,
          column: 'file',
          message: error instanceof Error ? error.message : 'Failed to process file',
        }],
      });

      logger.error({ error, jobId }, 'Rules import failed');
      throw error;
    }
  }

  async processTemplatesImport(jobId: string, csvContent: string): Promise<ImportResult> {
    const job = await this.getImportJob(jobId);
    if (!job) {
      throw new Error('Import job not found');
    }

    await this.updateJobStatus(jobId, 'processing');

    try {
      const records = csv.parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ImportRow[];

      const totalRows = records.length;
      let processedRows = 0;
      let successfulRows = 0;
      let failedRows = 0;
      const errors: ValidationError[] = [];

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNumber = i + 2;

        try {
          const validatedTemplate = await this.validateTemplateRow(row, rowNumber);
          await ruleTemplateService.createTemplate(validatedTemplate);
          successfulRows++;
        } catch (error) {
          failedRows++;
          errors.push({
            row: rowNumber,
            column: 'general',
            message: error instanceof Error ? error.message : 'Unknown error',
            value: row,
          });
        }

        processedRows++;

        if (processedRows % 10 === 0 || processedRows === totalRows) {
          await this.updateJobStatus(jobId, 'processing', {
            processedRows,
            successfulRows,
            failedRows,
            validationErrors: errors,
          });
        }
      }

      await this.updateJobStatus(jobId, 'completed', {
        processedRows,
        successfulRows,
        failedRows,
        validationErrors: errors,
      });

      logger.info({ 
        jobId, 
        totalRows, 
        successfulRows, 
        failedRows 
      }, 'Templates import completed');

      return {
        jobId,
        totalRows,
        processedRows,
        successfulRows,
        failedRows,
        errors,
      };

    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', {
        validationErrors: [{
          row: 0,
          column: 'file',
          message: error instanceof Error ? error.message : 'Failed to process file',
        }],
      });

      logger.error({ error, jobId }, 'Templates import failed');
      throw error;
    }
  }

  async cancelImportJob(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, 'cancelled');
    logger.info({ jobId }, 'Import job cancelled');
  }

  async getImportTemplate(type: 'rules' | 'templates'): Promise<string> {
    if (type === 'rules') {
      return this.getRulesImportTemplate();
    } else if (type === 'templates') {
      return this.getTemplatesImportTemplate();
    } else {
      throw new Error('Invalid template type');
    }
  }

  private async validateRuleRow(row: ImportRow, rowNumber: number): Promise<InsertComplianceRule> {
    const errors: string[] = [];

    // Required fields validation
    if (!row.countryIso) errors.push('Country ISO is required');
    if (!row.ruleType) errors.push('Rule type is required');
    if (!row.description) errors.push('Description is required');
    if (!row.severity) errors.push('Severity is required');
    if (!row.effectiveFrom) errors.push('Effective from date is required');

    // Country validation
    let countryId: string;
    if (row.countryIso) {
      const [country] = await db
        .select({ id: countries.id })
        .from(countries)
        .where(eq(countries.iso, row.countryIso.toUpperCase()))
        .limit(1);

      if (!country) {
        errors.push(`Country with ISO '${row.countryIso}' not found`);
      } else {
        countryId = country.id;
      }
    }

    // Severity validation
    const severity = parseInt(row.severity);
    if (isNaN(severity) || severity < 1 || severity > 10) {
      errors.push('Severity must be a number between 1 and 10');
    }

    // Date validation
    const effectiveFrom = new Date(row.effectiveFrom);
    if (isNaN(effectiveFrom.getTime())) {
      errors.push('Effective from must be a valid date');
    }

    // Status validation
    const status = row.status || 'draft';
    if (!['draft', 'published'].includes(status)) {
      errors.push('Status must be either "draft" or "published"');
    }

    if (errors.length > 0) {
      throw new Error(`Row ${rowNumber}: ${errors.join(', ')}`);
    }

    return {
      countryId: countryId!,
      ruleType: row.ruleType,
      description: row.description,
      severity,
      effectiveFrom,
      sourceUrl: row.sourceUrl || null,
      status,
      version: parseInt(row.version) || 1,
    };
  }

  private async validateTemplateRow(row: ImportRow, rowNumber: number): Promise<InsertRuleTemplate> {
    const errors: string[] = [];

    // Required fields validation
    if (!row.name) errors.push('Name is required');
    if (!row.description) errors.push('Description is required');
    if (!row.category) errors.push('Category is required');
    if (!row.templateFields) errors.push('Template fields are required');
    if (!row.createdBy) errors.push('Created by is required');

    // Category validation
    const validCategories = ['tax', 'employment', 'data_privacy', 'financial', 'regulatory'];
    if (row.category && !validCategories.includes(row.category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }

    // Template fields validation
    let templateFields: any[];
    try {
      templateFields = JSON.parse(row.templateFields);
      if (!Array.isArray(templateFields)) {
        errors.push('Template fields must be a JSON array');
      }
    } catch {
      errors.push('Template fields must be valid JSON');
    }

    // Default severity validation
    const defaultSeverity = parseInt(row.defaultSeverity) || 5;
    if (defaultSeverity < 1 || defaultSeverity > 10) {
      errors.push('Default severity must be between 1 and 10');
    }

    if (errors.length > 0) {
      throw new Error(`Row ${rowNumber}: ${errors.join(', ')}`);
    }

    return {
      name: row.name,
      description: row.description,
      category: row.category,
      templateFields: templateFields!,
      defaultSeverity,
      applicableRegions: row.applicableRegions ? JSON.parse(row.applicableRegions) : [],
      sourceType: row.sourceType || 'internal',
      tags: row.tags ? JSON.parse(row.tags) : [],
      isActive: row.isActive !== 'false',
      createdBy: row.createdBy,
    };
  }

  private getRulesImportTemplate(): string {
    return `countryIso,ruleType,description,severity,effectiveFrom,sourceUrl,status,version
US,"Tax Compliance","State-level contractor tax obligations",7,"2024-01-01","https://example.com","draft",1
GB,"Worker Classification","Employment status determination",6,"2024-01-01","","published",1`;
  }

  private getTemplatesImportTemplate(): string {
    return `name,description,category,templateFields,defaultSeverity,applicableRegions,sourceType,tags,isActive,createdBy
"Tax Compliance Template","Template for tax compliance rules","tax","[{\\"name\\":\\"taxRate\\",\\"label\\":\\"Tax Rate\\",\\"type\\":\\"number\\",\\"required\\":true}]",7,"[\\"US\\",\\"CA\\"]","legal_framework","[\\"tax\\",\\"compliance\\"]",true,"admin"
"Employment Template","Template for employment rules","employment","[{\\"name\\":\\"employmentType\\",\\"label\\":\\"Employment Type\\",\\"type\\":\\"select\\",\\"required\\":true,\\"options\\":[\\"contractor\\",\\"employee\\"]}]",6,"[\\"EU\\"]","internal","[\\"employment\\"]",true,"admin"`;
  }
}

export const bulkImportService = new BulkImportService();