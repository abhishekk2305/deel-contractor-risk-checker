import { eq, desc, asc, and, or, sql, count, gte, lte } from "drizzle-orm";
import { db } from "../lib/database";
import {
  auditTrails,
  approvalWorkflows,
  approvalRequests,
  users,
  AuditTrail,
  ApprovalWorkflow,
  ApprovalRequest,
  InsertAuditTrail,
  InsertApprovalWorkflow,
  InsertApprovalRequest,
} from "@shared/schema";
import { createChildLogger } from "../lib/logger";

const logger = createChildLogger('audit-service');

interface AuditFilters {
  actor?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  riskLevel?: string;
  approvalStatus?: string;
  fromDate?: Date;
  toDate?: Date;
  requiresApproval?: boolean;
}

interface ApprovalStep {
  stepOrder: number;
  approverRole: string;
  approverUsers?: string[]; // Specific users who can approve
  requiredApprovals: number; // Number of approvals needed from this step
  autoApprove?: boolean;
  conditions?: Record<string, any>;
}

interface WorkflowTriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: any;
}

export class AuditService {
  // Audit Trail Management
  async createAuditEntry(auditData: InsertAuditTrail): Promise<AuditTrail> {
    // Determine if this action requires approval
    const requiresApproval = await this.shouldRequireApproval(
      auditData.entity,
      auditData.action,
      auditData.newValues,
      auditData.riskLevel
    );

    const [created] = await db
      .insert(auditTrails)
      .values({
        ...auditData,
        requiresApproval,
        approvalStatus: requiresApproval ? 'pending' : null,
      })
      .returning();

    // Create approval request if needed
    if (requiresApproval) {
      await this.createApprovalRequest(created);
    }

    logger.info({ 
      auditId: created.id, 
      actor: created.actor,
      action: created.action,
      entity: created.entity,
      requiresApproval 
    }, 'Audit entry created');

    return created;
  }

  async getAuditTrail(filters: AuditFilters = {}, limit: number = 100, offset: number = 0): Promise<{
    items: AuditTrail[];
    total: number;
  }> {
    let query = db.select().from(auditTrails);
    let countQuery = db.select({ count: count() }).from(auditTrails);

    const conditions = [];

    if (filters.actor) {
      conditions.push(eq(auditTrails.actor, filters.actor));
    }

    if (filters.action) {
      conditions.push(eq(auditTrails.action, filters.action));
    }

    if (filters.entity) {
      conditions.push(eq(auditTrails.entity, filters.entity));
    }

    if (filters.entityId) {
      conditions.push(eq(auditTrails.entityId, filters.entityId));
    }

    if (filters.riskLevel) {
      conditions.push(eq(auditTrails.riskLevel, filters.riskLevel));
    }

    if (filters.approvalStatus) {
      conditions.push(eq(auditTrails.approvalStatus, filters.approvalStatus));
    }

    if (filters.requiresApproval !== undefined) {
      conditions.push(eq(auditTrails.requiresApproval, filters.requiresApproval));
    }

    if (filters.fromDate) {
      conditions.push(gte(auditTrails.createdAt, filters.fromDate));
    }

    if (filters.toDate) {
      conditions.push(lte(auditTrails.createdAt, filters.toDate));
    }

    if (conditions.length > 0) {
      const whereCondition = and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    const [items, [{ count: total }]] = await Promise.all([
      query.orderBy(desc(auditTrails.createdAt)).limit(limit).offset(offset),
      countQuery,
    ]);

    return { items, total };
  }

  async getEntityAuditHistory(entity: string, entityId: string): Promise<AuditTrail[]> {
    return db
      .select()
      .from(auditTrails)
      .where(
        and(
          eq(auditTrails.entity, entity),
          eq(auditTrails.entityId, entityId)
        )
      )
      .orderBy(desc(auditTrails.createdAt));
  }

  async approveAuditEntry(auditId: string, approvedBy: string): Promise<AuditTrail> {
    const [updated] = await db
      .update(auditTrails)
      .set({
        approvalStatus: 'approved',
        approvedBy,
        approvedAt: new Date(),
      })
      .where(eq(auditTrails.id, auditId))
      .returning();

    logger.info({ auditId, approvedBy }, 'Audit entry approved');
    return updated;
  }

  async rejectAuditEntry(auditId: string, rejectedBy: string, reason: string): Promise<AuditTrail> {
    const [updated] = await db
      .update(auditTrails)
      .set({
        approvalStatus: 'rejected',
        approvedBy: rejectedBy,
        approvedAt: new Date(),
        rejectionReason: reason,
      })
      .where(eq(auditTrails.id, auditId))
      .returning();

    logger.info({ auditId, rejectedBy, reason }, 'Audit entry rejected');
    return updated;
  }

  // Approval Workflow Management
  async createWorkflow(workflowData: InsertApprovalWorkflow): Promise<ApprovalWorkflow> {
    // Validate workflow steps
    this.validateWorkflowSteps(workflowData.approvalSteps as ApprovalStep[]);

    const [created] = await db
      .insert(approvalWorkflows)
      .values({
        ...workflowData,
        updatedAt: new Date(),
      })
      .returning();

    logger.info({ 
      workflowId: created.id, 
      name: created.name,
      entityType: created.entityType 
    }, 'Approval workflow created');

    return created;
  }

  async getWorkflows(entityType?: string, isActive?: boolean): Promise<ApprovalWorkflow[]> {
    let query = db.select().from(approvalWorkflows);

    const conditions = [];

    if (entityType) {
      conditions.push(eq(approvalWorkflows.entityType, entityType));
    }

    if (isActive !== undefined) {
      conditions.push(eq(approvalWorkflows.isActive, isActive));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query.orderBy(desc(approvalWorkflows.createdAt));
  }

  async updateWorkflow(id: string, updates: Partial<InsertApprovalWorkflow>): Promise<ApprovalWorkflow> {
    if (updates.approvalSteps) {
      this.validateWorkflowSteps(updates.approvalSteps as ApprovalStep[]);
    }

    const [updated] = await db
      .update(approvalWorkflows)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(approvalWorkflows.id, id))
      .returning();

    return updated;
  }

  async deactivateWorkflow(id: string): Promise<void> {
    await db
      .update(approvalWorkflows)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(approvalWorkflows.id, id));

    logger.info({ workflowId: id }, 'Approval workflow deactivated');
  }

  // Approval Request Management
  async createApprovalRequest(auditEntry: AuditTrail): Promise<ApprovalRequest | null> {
    // Find applicable workflow
    const workflow = await this.findApplicableWorkflow(
      auditEntry.entity,
      auditEntry.action,
      auditEntry.newValues,
      auditEntry.riskLevel
    );

    if (!workflow) {
      return null;
    }

    const [created] = await db
      .insert(approvalRequests)
      .values({
        workflowId: workflow.id,
        entityType: auditEntry.entity,
        entityId: auditEntry.entityId,
        requestedBy: auditEntry.actor,
        currentStep: 0,
        status: 'pending',
        approvalHistory: [],
        requestData: {
          auditId: auditEntry.id,
          action: auditEntry.action,
          changes: auditEntry.newValues,
        },
        priority: this.determinePriority(auditEntry.riskLevel),
        updatedAt: new Date(),
      })
      .returning();

    logger.info({ 
      requestId: created.id, 
      workflowId: workflow.id,
      entityType: auditEntry.entity,
      entityId: auditEntry.entityId 
    }, 'Approval request created');

    return created;
  }

  async getApprovalRequests(filters: {
    status?: string;
    entityType?: string;
    requestedBy?: string;
    workflowId?: string;
  } = {}): Promise<ApprovalRequest[]> {
    let query = db.select().from(approvalRequests);

    const conditions = [];

    if (filters.status) {
      conditions.push(eq(approvalRequests.status, filters.status));
    }

    if (filters.entityType) {
      conditions.push(eq(approvalRequests.entityType, filters.entityType));
    }

    if (filters.requestedBy) {
      conditions.push(eq(approvalRequests.requestedBy, filters.requestedBy));
    }

    if (filters.workflowId) {
      conditions.push(eq(approvalRequests.workflowId, filters.workflowId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query.orderBy(desc(approvalRequests.createdAt));
  }

  async processApprovalRequest(
    requestId: string,
    approverId: string,
    action: 'approve' | 'reject',
    comments?: string
  ): Promise<ApprovalRequest> {
    const [request] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error('Approval request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Request is not pending approval');
    }

    // Get workflow to understand approval steps
    const [workflow] = await db
      .select()
      .from(approvalWorkflows)
      .where(eq(approvalWorkflows.id, request.workflowId))
      .limit(1);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const approvalSteps = workflow.approvalSteps as ApprovalStep[];
    const currentStep = approvalSteps[request.currentStep];

    if (!currentStep) {
      throw new Error('Invalid approval step');
    }

    // Validate approver has permission
    await this.validateApprover(approverId, currentStep);

    // Update approval history
    const approvalHistory = (request.approvalHistory as any[]) || [];
    approvalHistory.push({
      step: request.currentStep,
      approverId,
      action,
      comments,
      timestamp: new Date(),
    });

    let newStatus = request.status;
    let nextStep = request.currentStep;

    if (action === 'reject') {
      newStatus = 'rejected';
    } else {
      // Check if current step is complete
      const currentStepApprovals = approvalHistory.filter(
        h => h.step === request.currentStep && h.action === 'approve'
      );

      if (currentStepApprovals.length >= currentStep.requiredApprovals) {
        // Move to next step
        nextStep = request.currentStep + 1;

        if (nextStep >= approvalSteps.length) {
          // All steps completed
          newStatus = 'approved';
          
          // Auto-approve the original audit entry
          const requestData = request.requestData as any;
          if (requestData.auditId) {
            await this.approveAuditEntry(requestData.auditId, approverId);
          }
        }
      }
    }

    const [updated] = await db
      .update(approvalRequests)
      .set({
        currentStep: nextStep,
        status: newStatus,
        approvalHistory,
        comments: comments || request.comments,
        updatedAt: new Date(),
      })
      .where(eq(approvalRequests.id, requestId))
      .returning();

    logger.info({ 
      requestId, 
      approverId, 
      action, 
      newStatus,
      currentStep: nextStep 
    }, 'Approval request processed');

    return updated;
  }

  // Helper methods
  private async shouldRequireApproval(
    entity: string,
    action: string,
    changes: any,
    riskLevel: string
  ): Promise<boolean> {
    // Find applicable workflows
    const workflows = await this.getWorkflows(entity, true);
    
    for (const workflow of workflows) {
      if (await this.matchesTriggerConditions(workflow, action, changes, riskLevel)) {
        return true;
      }
    }

    // Default rules for high-risk actions
    if (riskLevel === 'critical' || riskLevel === 'high') {
      return true;
    }

    if (['publish', 'delete'].includes(action)) {
      return true;
    }

    return false;
  }

  private async findApplicableWorkflow(
    entity: string,
    action: string,
    changes: any,
    riskLevel: string
  ): Promise<ApprovalWorkflow | null> {
    const workflows = await this.getWorkflows(entity, true);
    
    for (const workflow of workflows) {
      if (await this.matchesTriggerConditions(workflow, action, changes, riskLevel)) {
        return workflow;
      }
    }

    return null;
  }

  private async matchesTriggerConditions(
    workflow: ApprovalWorkflow,
    action: string,
    changes: any,
    riskLevel: string
  ): Promise<boolean> {
    const conditions = workflow.triggerConditions as WorkflowTriggerCondition[];
    
    if (!conditions || conditions.length === 0) {
      return true; // No conditions means applies to all
    }

    const context = {
      action,
      riskLevel,
      ...(changes || {}),
    };

    for (const condition of conditions) {
      const value = context[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'contains':
          if (!String(value).includes(condition.value)) return false;
          break;
        case 'greater_than':
          if (Number(value) <= Number(condition.value)) return false;
          break;
        case 'less_than':
          if (Number(value) >= Number(condition.value)) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(value)) return false;
          break;
      }
    }

    return true;
  }

  private validateWorkflowSteps(steps: ApprovalStep[]): void {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('Workflow must have at least one approval step');
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      if (step.stepOrder !== i) {
        throw new Error(`Step order mismatch at step ${i}`);
      }

      if (!step.approverRole) {
        throw new Error(`Step ${i} must have an approver role`);
      }

      if (step.requiredApprovals < 1) {
        throw new Error(`Step ${i} must require at least 1 approval`);
      }
    }
  }

  private async validateApprover(approverId: string, step: ApprovalStep): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, approverId))
      .limit(1);

    if (!user) {
      throw new Error('Approver not found');
    }

    // Check if user has required role
    if (user.role !== step.approverRole && user.role !== 'admin') {
      throw new Error(`User does not have required role: ${step.approverRole}`);
    }

    // Check if user is in specific approver list (if specified)
    if (step.approverUsers && step.approverUsers.length > 0) {
      if (!step.approverUsers.includes(approverId)) {
        throw new Error('User is not authorized to approve this step');
      }
    }
  }

  private determinePriority(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical':
        return 'urgent';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  // Analytics and reporting
  async getAuditStatistics(fromDate?: Date, toDate?: Date): Promise<{
    totalEntries: number;
    pendingApprovals: number;
    approvedEntries: number;
    rejectedEntries: number;
    byRiskLevel: Record<string, number>;
    byAction: Record<string, number>;
    byEntity: Record<string, number>;
  }> {
    const conditions = [];
    
    if (fromDate) {
      conditions.push(gte(auditTrails.createdAt, fromDate));
    }
    
    if (toDate) {
      conditions.push(lte(auditTrails.createdAt, toDate));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const [
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      riskLevelStats,
      actionStats,
      entityStats,
    ] = await Promise.all([
      // Total entries
      db.select({ count: count() }).from(auditTrails).where(whereCondition),
      
      // Pending approvals
      db.select({ count: count() })
        .from(auditTrails)
        .where(and(eq(auditTrails.approvalStatus, 'pending'), whereCondition)),
      
      // Approved entries
      db.select({ count: count() })
        .from(auditTrails)
        .where(and(eq(auditTrails.approvalStatus, 'approved'), whereCondition)),
      
      // Rejected entries
      db.select({ count: count() })
        .from(auditTrails)
        .where(and(eq(auditTrails.approvalStatus, 'rejected'), whereCondition)),
      
      // By risk level
      db.select({ 
        riskLevel: auditTrails.riskLevel, 
        count: count() 
      })
        .from(auditTrails)
        .where(whereCondition)
        .groupBy(auditTrails.riskLevel),
      
      // By action
      db.select({ 
        action: auditTrails.action, 
        count: count() 
      })
        .from(auditTrails)
        .where(whereCondition)
        .groupBy(auditTrails.action),
      
      // By entity
      db.select({ 
        entity: auditTrails.entity, 
        count: count() 
      })
        .from(auditTrails)
        .where(whereCondition)
        .groupBy(auditTrails.entity),
    ]);

    return {
      totalEntries: totalCount[0].count,
      pendingApprovals: pendingCount[0].count,
      approvedEntries: approvedCount[0].count,
      rejectedEntries: rejectedCount[0].count,
      byRiskLevel: Object.fromEntries(
        riskLevelStats.map(r => [r.riskLevel, r.count])
      ),
      byAction: Object.fromEntries(
        actionStats.map(r => [r.action, r.count])
      ),
      byEntity: Object.fromEntries(
        entityStats.map(r => [r.entity, r.count])
      ),
    };
  }
}

export const auditService = new AuditService();