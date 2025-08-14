import { Request, Response } from 'express';
import { db } from '../lib/database';
import { countries, complianceRules } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { metricsCollector } from './metrics';
import { createChildLogger } from '../lib/logger';

const logger = createChildLogger('health');

// Get build information from environment or generate at startup
const BUILD_SHA = process.env.BUILD_SHA || process.env.REPL_ID || 'development';
const BUILD_VERSION = process.env.BUILD_VERSION || '1.0.0';
const START_TIME = new Date();

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  buildSha: string;
  uptime: number;
  checks: {
    database: boolean;
    redis?: boolean;
    recentActivity: boolean;
  };
  rulesetVersion?: number;
  metrics?: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    requestsPerMinute: number;
  };
}

export async function healthCheck(req: Request, res: Response) {
  const startTime = Date.now();
  let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  
  const checks = {
    database: false,
    redis: false,
    recentActivity: false
  };

  try {
    // Database health check
    try {
      const result = await db.select().from(countries).limit(1);
      checks.database = result.length > 0;
    } catch (error) {
      logger.error({ error }, 'Database health check failed');
      checks.database = false;
      status = 'unhealthy';
    }

    // Redis health check (if configured)
    try {
      // Note: Redis is optional in our setup, using fallback mode
      checks.redis = true; // Always true in fallback mode
    } catch (error) {
      logger.warn({ error }, 'Redis health check failed, using fallback');
      checks.redis = false;
      status = status === 'healthy' ? 'degraded' : status;
    }

    // Check recent activity (any requests in last 5 minutes)
    try {
      const recentMetrics = metricsCollector.getRecentMetrics(5 * 60 * 1000);
      checks.recentActivity = recentMetrics.length > 0 || Date.now() - START_TIME.getTime() < 5 * 60 * 1000;
    } catch (error) {
      logger.warn({ error }, 'Recent activity check failed');
      checks.recentActivity = false;
    }

    // Get current ruleset version (optional)
    let rulesetVersion: number | undefined;
    try {
      // Get the latest published ruleset version from any country
      const rules = await db.select().from(complianceRules).where(eq(complianceRules.status, 'published')).limit(1);
      rulesetVersion = rules.length > 0 ? rules[0].version : 1;
    } catch (error) {
      logger.warn({ error }, 'Failed to get ruleset version');
      rulesetVersion = 1; // Default
    }

    // Get metrics summary
    const metrics = metricsCollector.getStats();

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      version: BUILD_VERSION,
      buildSha: BUILD_SHA,
      uptime: Date.now() - START_TIME.getTime(),
      checks,
      rulesetVersion,
      metrics
    };

    const duration = Date.now() - startTime;
    logger.debug({ 
      status, 
      duration, 
      checks,
      rulesetVersion 
    }, 'Health check completed');

    // Set appropriate HTTP status
    const httpStatus = status === 'healthy' ? 200 : 
                      status === 'degraded' ? 200 : 503;

    res.status(httpStatus).json(healthStatus);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({ error, duration }, 'Health check failed');
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: BUILD_VERSION,
      buildSha: BUILD_SHA,
      uptime: Date.now() - START_TIME.getTime(),
      checks: {
        database: false,
        redis: false,
        recentActivity: false
      },
      error: 'Health check failed'
    } as HealthStatus);
  }
}

export async function metricsEndpoint(req: Request, res: Response) {
  try {
    const format = req.query.format as string || req.get('Accept');
    
    if (format === 'application/json' || format?.includes('json')) {
      // JSON format for dashboard consumption
      const stats = metricsCollector.getStats();
      const recentMetrics = metricsCollector.getRecentMetrics(60 * 60 * 1000); // Last hour
      
      res.json({
        summary: stats,
        recentRequests: recentMetrics.length,
        timestamp: new Date().toISOString()
      });
    } else {
      // Prometheus format (default)
      const prometheusMetrics = metricsCollector.getPrometheusMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4');
      res.send(prometheusMetrics);
    }
  } catch (error) {
    logger.error({ error }, 'Metrics endpoint failed');
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
}

export async function readinessCheck(req: Request, res: Response) {
  // Readiness check - are we ready to serve traffic?
  try {
    // Check if database is accessible and has basic data
    const result = await db.select().from(countries).limit(1);
    
    if (result.length === 0) {
      return res.status(503).json({
        ready: false,
        reason: 'No countries data available',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
      buildSha: BUILD_SHA,
      dataStatus: {
        countriesCount: result.length
      }
    });

  } catch (error) {
    logger.error({ error }, 'Readiness check failed');
    res.status(503).json({
      ready: false,
      reason: 'Database not accessible',
      timestamp: new Date().toISOString()
    });
  }
}

export async function livenessCheck(req: Request, res: Response) {
  // Liveness check - is the application alive?
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - START_TIME.getTime(),
    buildSha: BUILD_SHA
  });
}