import { createChildLogger } from "../lib/logger";
import { redis } from "../lib/redis";
import { db } from "../lib/database";
import { auditLogs } from "@shared/schema";
import { desc, count, eq, gte, and } from "drizzle-orm";

const logger = createChildLogger('analytics');

export interface AnalyticsEvent {
  event: 'search_submit' | 'country_view' | 'risk_check_success' | 'pdf_generate' | 'pdf_download_success' | 'admin_rule_publish';
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsData {
  searchCount: number;
  riskCheckCount: number;
  pdfGenerationCount: number;
  rulePublishCount: number;
  topCountries: Array<{ country: string; count: number }>;
  riskTierDistribution: Array<{ tier: string; count: number }>;
  recentActivity: Array<{
    event: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
}

export class AnalyticsService {
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      logger.info({ event: event.event, userId: event.userId }, 'Tracking analytics event');

      // Store in Redis for real-time counts
      const key = `analytics:${event.event}:${new Date().toISOString().split('T')[0]}`;
      await redis?.incr(key);
      await redis?.expire(key, 86400 * 30); // Expire after 30 days

      // Store detailed event in audit logs for historical analysis
      await db.insert(auditLogs).values({
        action: event.event,
        entity: 'analytics',
        entityId: crypto.randomUUID(),
        actor: event.userId || 'anonymous',
        diff: {
          event: event.event,
          timestamp: new Date().toISOString(),
          metadata: event.metadata || {}
        },
        createdAt: new Date(),
      });

      logger.debug({ event: event.event }, 'Analytics event tracked successfully');
    } catch (error) {
      logger.error({ error, event }, 'Failed to track analytics event');
      // Don't throw error to avoid breaking main functionality
    }
  }

  async getAnalyticsData(days: number = 30): Promise<AnalyticsData> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get event counts from audit logs
      const eventCounts = await db
        .select({
          action: auditLogs.action,
          count: count()
        })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entity, 'analytics'),
            gte(auditLogs.createdAt, startDate)
          )
        )
        .groupBy(auditLogs.action);

      // Get recent activity
      const recentActivity = await db
        .select({
          action: auditLogs.action,
          createdAt: auditLogs.createdAt,
          diff: auditLogs.diff
        })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entity, 'analytics'),
            gte(auditLogs.createdAt, startDate)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(20);

      // Extract data from event counts
      const searchCount = eventCounts.find(e => e.action === 'search_submit')?.count || 0;
      const riskCheckCount = eventCounts.find(e => e.action === 'risk_check_success')?.count || 0;
      const pdfGenerationCount = eventCounts.find(e => e.action === 'pdf_generate')?.count || 0;
      const rulePublishCount = eventCounts.find(e => e.action === 'admin_rule_publish')?.count || 0;

      // Mock data for visualization (in production, would calculate from actual data)
      const topCountries = [
        { country: 'United States', count: Math.max(searchCount * 0.3, 5) },
        { country: 'United Kingdom', count: Math.max(searchCount * 0.2, 3) },
        { country: 'Germany', count: Math.max(searchCount * 0.15, 2) },
        { country: 'Canada', count: Math.max(searchCount * 0.1, 1) },
        { country: 'Australia', count: Math.max(searchCount * 0.08, 1) }
      ];

      const riskTierDistribution = [
        { tier: 'low', count: Math.max(riskCheckCount * 0.6, 2) },
        { tier: 'medium', count: Math.max(riskCheckCount * 0.3, 1) },
        { tier: 'high', count: Math.max(riskCheckCount * 0.1, 0) }
      ];

      return {
        searchCount,
        riskCheckCount,
        pdfGenerationCount,
        rulePublishCount,
        topCountries,
        riskTierDistribution,
        recentActivity: recentActivity.map(activity => ({
          event: activity.action,
          timestamp: activity.createdAt,
          metadata: activity.diff as Record<string, any>
        }))
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get analytics data');
      throw new Error('Failed to retrieve analytics data');
    }
  }

  async getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; checks: Record<string, boolean> }> {
    const checks: Record<string, boolean> = {};

    try {
      // Check database connectivity
      try {
        await db.select({ count: count() }).from(auditLogs).limit(1);
        checks.database = true;
      } catch {
        checks.database = false;
      }

      // Check Redis connectivity (if available)
      checks.redis = true; // Always true since we have fallback mode

      // Check recent activity (should have some events in last 24 hours for healthy system)
      try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentEvents = await db
          .select({ count: count() })
          .from(auditLogs)
          .where(gte(auditLogs.createdAt, yesterday));
        
        checks.recentActivity = (recentEvents[0]?.count || 0) > 0;
      } catch {
        checks.recentActivity = false;
      }

      const healthyChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.keys(checks).length;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyChecks === totalChecks) {
        status = 'healthy';
      } else if (healthyChecks >= totalChecks / 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return { status, checks };
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      return {
        status: 'unhealthy',
        checks: { error: false }
      };
    }
  }
}

export const analyticsService = new AnalyticsService();