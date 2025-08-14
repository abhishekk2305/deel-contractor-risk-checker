import { eq, desc, asc, like, and, or, sql, count } from "drizzle-orm";
import { db } from "../lib/database";
import {
  ruleTemplates,
  complianceRules,
  countries,
  users,
  RuleTemplate,
  InsertRuleTemplate,
  InsertComplianceRule,
  ComplianceRule,
} from "@shared/schema";
import { createChildLogger } from "../lib/logger";

const logger = createChildLogger('rule-template-service');

export interface RuleTemplateField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'textarea';
  required: boolean;
  options?: string[]; // For select fields
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface RuleTemplateFilters {
  category?: string;
  region?: string;
  isActive?: boolean;
  createdBy?: string;
  search?: string;
}

export interface CreateRuleFromTemplateRequest {
  templateId: string;
  countryId: string;
  fieldValues: Record<string, any>;
  createdBy: string;
}

export class RuleTemplateService {
  async getTemplates(filters?: RuleTemplateFilters): Promise<RuleTemplate[]> {
    let query = db
      .select({
        id: ruleTemplates.id,
        name: ruleTemplates.name,
        description: ruleTemplates.description,
        category: ruleTemplates.category,
        templateFields: ruleTemplates.templateFields,
        defaultSeverity: ruleTemplates.defaultSeverity,
        applicableRegions: ruleTemplates.applicableRegions,
        sourceType: ruleTemplates.sourceType,
        tags: ruleTemplates.tags,
        isActive: ruleTemplates.isActive,
        createdBy: ruleTemplates.createdBy,
        createdAt: ruleTemplates.createdAt,
        updatedAt: ruleTemplates.updatedAt,
      })
      .from(ruleTemplates);

    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(ruleTemplates.category, filters.category));
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(ruleTemplates.isActive, filters.isActive));
    }

    if (filters?.createdBy) {
      conditions.push(eq(ruleTemplates.createdBy, filters.createdBy));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(ruleTemplates.name, `%${filters.search}%`),
          like(ruleTemplates.description, `%${filters.search}%`)
        )
      );
    }

    if (filters?.region) {
      conditions.push(
        sql`jsonb_array_elements_text(${ruleTemplates.applicableRegions}) = ${filters.region}`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query.orderBy(desc(ruleTemplates.updatedAt));
  }

  async getTemplate(id: string): Promise<RuleTemplate | undefined> {
    const [template] = await db
      .select()
      .from(ruleTemplates)
      .where(eq(ruleTemplates.id, id))
      .limit(1);

    return template;
  }

  async createTemplate(template: InsertRuleTemplate): Promise<RuleTemplate> {
    // Validate template fields structure
    this.validateTemplateFields(template.templateFields as RuleTemplateField[]);

    const [created] = await db
      .insert(ruleTemplates)
      .values({
        ...template,
        updatedAt: new Date(),
      })
      .returning();

    logger.info({ templateId: created.id, name: created.name }, 'Rule template created');
    return created;
  }

  async updateTemplate(id: string, updates: Partial<InsertRuleTemplate>): Promise<RuleTemplate> {
    if (updates.templateFields) {
      this.validateTemplateFields(updates.templateFields as RuleTemplateField[]);
    }

    const [updated] = await db
      .update(ruleTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(ruleTemplates.id, id))
      .returning();

    logger.info({ templateId: id }, 'Rule template updated');
    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    await db
      .update(ruleTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(ruleTemplates.id, id));

    logger.info({ templateId: id }, 'Rule template deactivated');
  }

  async createRuleFromTemplate(request: CreateRuleFromTemplateRequest): Promise<ComplianceRule> {
    const template = await this.getTemplate(request.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Validate field values against template schema
    this.validateFieldValues(
      template.templateFields as RuleTemplateField[],
      request.fieldValues
    );

    // Generate rule description and type based on template
    const ruleDescription = this.generateRuleDescription(
      template,
      request.fieldValues
    );
    
    const ruleType = this.determineRuleType(template, request.fieldValues);

    const ruleData: InsertComplianceRule = {
      countryId: request.countryId,
      ruleType,
      description: ruleDescription,
      severity: request.fieldValues.severity || template.defaultSeverity,
      effectiveFrom: new Date(request.fieldValues.effectiveFrom || new Date()),
      sourceUrl: request.fieldValues.sourceUrl || null,
      status: 'draft',
      version: 1,
    };

    const [created] = await db
      .insert(complianceRules)
      .values(ruleData)
      .returning();

    logger.info({ 
      ruleId: created.id, 
      templateId: request.templateId,
      countryId: request.countryId 
    }, 'Rule created from template');

    return created;
  }

  async getTemplateCategories(): Promise<string[]> {
    const result = await db
      .selectDistinct({ category: ruleTemplates.category })
      .from(ruleTemplates)
      .where(eq(ruleTemplates.isActive, true));

    return result.map(r => r.category);
  }

  async getTemplatesByCategory(): Promise<Record<string, RuleTemplate[]>> {
    const templates = await this.getTemplates({ isActive: true });
    
    return templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    }, {} as Record<string, RuleTemplate[]>);
  }

  async duplicateTemplate(id: string, newName: string, createdBy: string): Promise<RuleTemplate> {
    const template = await this.getTemplate(id);
    if (!template) {
      throw new Error('Template not found');
    }

    const duplicateData: InsertRuleTemplate = {
      name: newName,
      description: `${template.description} (Copy)`,
      category: template.category,
      templateFields: template.templateFields,
      defaultSeverity: template.defaultSeverity,
      applicableRegions: template.applicableRegions,
      sourceType: template.sourceType,
      tags: template.tags,
      isActive: true,
      createdBy,
    };

    return this.createTemplate(duplicateData);
  }

  private validateTemplateFields(fields: RuleTemplateField[]): void {
    if (!Array.isArray(fields)) {
      throw new Error('Template fields must be an array');
    }

    for (const field of fields) {
      if (!field.name || !field.label || !field.type) {
        throw new Error('Each field must have name, label, and type');
      }

      const validTypes = ['text', 'number', 'date', 'select', 'boolean', 'textarea'];
      if (!validTypes.includes(field.type)) {
        throw new Error(`Invalid field type: ${field.type}`);
      }

      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        throw new Error('Select fields must have options');
      }
    }
  }

  private validateFieldValues(fields: RuleTemplateField[], values: Record<string, any>): void {
    for (const field of fields) {
      if (field.required && (values[field.name] === undefined || values[field.name] === null)) {
        throw new Error(`Required field missing: ${field.label}`);
      }

      const value = values[field.name];
      if (value !== undefined && value !== null) {
        // Type validation
        switch (field.type) {
          case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
              throw new Error(`${field.label} must be a number`);
            }
            if (field.validation?.min !== undefined && value < field.validation.min) {
              throw new Error(`${field.label} must be at least ${field.validation.min}`);
            }
            if (field.validation?.max !== undefined && value > field.validation.max) {
              throw new Error(`${field.label} must be at most ${field.validation.max}`);
            }
            break;
          case 'select':
            if (field.options && !field.options.includes(value)) {
              throw new Error(`${field.label} must be one of: ${field.options.join(', ')}`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              throw new Error(`${field.label} must be true or false`);
            }
            break;
          case 'date':
            if (!Date.parse(value)) {
              throw new Error(`${field.label} must be a valid date`);
            }
            break;
        }

        // Pattern validation
        if (field.validation?.pattern && typeof value === 'string') {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            throw new Error(`${field.label} format is invalid`);
          }
        }
      }
    }
  }

  private generateRuleDescription(template: RuleTemplate, values: Record<string, any>): string {
    let description = template.description;
    
    // Replace placeholders in description with actual values
    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{{${key}}}`;
      if (description.includes(placeholder)) {
        description = description.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    return description;
  }

  private determineRuleType(template: RuleTemplate, values: Record<string, any>): string {
    // Use explicit rule type if provided, otherwise derive from template category
    if (values.ruleType) {
      return values.ruleType;
    }

    // Map template categories to rule types
    const categoryToRuleType: Record<string, string> = {
      'tax': 'Tax Compliance',
      'employment': 'Worker Classification',
      'data_privacy': 'Data Protection',
      'financial': 'Payment Processing',
      'regulatory': 'Regulatory Compliance',
    };

    return categoryToRuleType[template.category] || 'General Compliance';
  }
}

export const ruleTemplateService = new RuleTemplateService();