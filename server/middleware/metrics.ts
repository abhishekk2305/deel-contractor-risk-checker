import { Request, Response, NextFunction } from 'express';
import { createChildLogger } from '../lib/logger';

const logger = createChildLogger('metrics');

interface MetricData {
  route: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
}

class MetricsCollector {
  private metrics: MetricData[] = [];
  private readonly MAX_METRICS = 10000; // Keep last 10k metrics in memory

  recordMetric(data: MetricData) {
    this.metrics.push(data);
    
    // Trim old metrics to prevent memory bloat
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log warning for slow requests (p95 > 2s)
    if (data.duration > 2000) {
      logger.warn({
        route: data.route,
        method: data.method,
        duration: data.duration,
        statusCode: data.statusCode
      }, 'Slow request detected (>2s)');
    }

    // Log warning for high error rates
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
    const errorRate = this.calculateErrorRate(recentMetrics);
    
    if (errorRate > 2 && recentMetrics.length > 10) { // Only alert if we have sufficient data
      logger.warn({
        route: data.route,
        errorRate: `${errorRate.toFixed(2)}%`,
        totalRequests: recentMetrics.length,
        errorCount: recentMetrics.filter(m => m.statusCode >= 400).length
      }, 'High error rate detected (>2%)');
    }
  }

  getMetrics(): MetricData[] {
    return [...this.metrics];
  }

  getRecentMetrics(windowMs: number): MetricData[] {
    const cutoff = new Date(Date.now() - windowMs);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  getPrometheusMetrics(): string {
    const routeStats = new Map<string, { count: number; totalDuration: number; errors: number }>();
    
    // Aggregate metrics by route
    for (const metric of this.metrics) {
      const key = `${metric.method}_${metric.route}`;
      const stats = routeStats.get(key) || { count: 0, totalDuration: 0, errors: 0 };
      
      stats.count++;
      stats.totalDuration += metric.duration;
      if (metric.statusCode >= 400) {
        stats.errors++;
      }
      
      routeStats.set(key, stats);
    }

    // Generate Prometheus format
    let output = '';
    
    // Request count metric
    output += '# HELP http_requests_total The total number of HTTP requests\n';
    output += '# TYPE http_requests_total counter\n';
    for (const [route, stats] of Array.from(routeStats.entries())) {
      const [method, path] = route.split('_', 2);
      output += `http_requests_total{method="${method}",route="${path}"} ${stats.count}\n`;
    }

    // Request duration metric  
    output += '# HELP http_request_duration_seconds The HTTP request latencies in seconds\n';
    output += '# TYPE http_request_duration_seconds histogram\n';
    for (const [route, stats] of Array.from(routeStats.entries())) {
      const [method, path] = route.split('_', 2);
      const avgDuration = stats.totalDuration / stats.count / 1000; // Convert to seconds
      output += `http_request_duration_seconds{method="${method}",route="${path}"} ${avgDuration.toFixed(6)}\n`;
    }

    return output;
  }

  getStats() {
    const recent = this.getRecentMetrics(60 * 60 * 1000); // Last hour
    
    if (recent.length === 0) {
      return {
        totalRequests: 0,
        errorRate: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        requestsPerMinute: 0
      };
    }

    const durations = recent.map(m => m.duration).sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const errors = recent.filter(m => m.statusCode >= 400).length;

    return {
      totalRequests: recent.length,
      errorRate: (errors / recent.length) * 100,
      averageResponseTime: recent.reduce((sum, m) => sum + m.duration, 0) / recent.length,
      p95ResponseTime: durations[p95Index] || 0,
      requestsPerMinute: recent.length / 60
    };
  }

  private calculateErrorRate(metrics: MetricData[]): number {
    if (metrics.length === 0) return 0;
    const errors = metrics.filter(m => m.statusCode >= 400).length;
    return (errors / metrics.length) * 100;
  }
}

export const metricsCollector = new MetricsCollector();

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Capture original end method
  const originalEnd = res.end;
  
  res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void) {
    const duration = Date.now() - startTime;
    
    // Clean route path for metrics (remove IDs and query params)
    let cleanRoute = req.route?.path || req.path;
    cleanRoute = cleanRoute.replace(/\/:[^\/]+/g, '/:id'); // Replace :param with :id
    cleanRoute = cleanRoute.replace(/\?.*$/, ''); // Remove query params
    
    metricsCollector.recordMetric({
      route: cleanRoute,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date()
    });

    logger.debug({
      method: req.method,
      route: cleanRoute,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent')
    }, 'Request completed');

    // Call original end method
    if (typeof encoding === 'function') {
      return originalEnd.call(this, chunk, encoding);
    }
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}