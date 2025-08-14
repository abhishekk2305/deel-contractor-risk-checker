import { eq, desc, asc, like, and, or, sql } from "drizzle-orm";
import { db } from "../lib/database";
import {
  externalDataSources,
  riskDataCache,
  countries,
  ExternalDataSource,
  RiskDataCache,
  InsertExternalDataSource,
  InsertRiskDataCache,
} from "@shared/schema";
import { createChildLogger } from "../lib/logger";
import fetch from 'node-fetch';

const logger = createChildLogger('external-data-service');

interface DataSourceConfig {
  apiKey?: string;
  baseUrl: string;
  headers?: Record<string, string>;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

interface WorldBankData {
  indicator: {
    id: string;
    value: string;
  };
  country: {
    id: string;
    value: string;
  };
  value: number | null;
  date: string;
}

interface OECDData {
  structure: {
    dimensions: any;
  };
  dataSets: Array<{
    observations: Record<string, [number | null]>;
  }>;
}

interface RiskIndicator {
  source: string;
  indicator: string;
  value: number;
  confidence: number;
  lastUpdated: Date;
}

export class ExternalDataService {
  private requestCounters = new Map<string, { minute: number, hour: number, lastReset: Date }>();

  async getDataSources(filters?: { 
    provider?: string; 
    country?: string; 
    isActive?: boolean 
  }): Promise<ExternalDataSource[]> {
    const conditions = [];
    
    if (filters?.provider) {
      conditions.push(eq(externalDataSources.provider, filters.provider));
    }
    
    if (filters?.country) {
      conditions.push(eq(externalDataSources.country, filters.country));
    }
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(externalDataSources.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(externalDataSources)
        .where(and(...conditions))
        .orderBy(desc(externalDataSources.createdAt));
    }

    return db
      .select()
      .from(externalDataSources)
      .orderBy(desc(externalDataSources.createdAt));
  }

  async createDataSource(sourceData: InsertExternalDataSource): Promise<ExternalDataSource> {
    // Validate API configuration
    await this.validateDataSourceConfig(sourceData);

    const [created] = await db
      .insert(externalDataSources)
      .values(sourceData)
      .returning();

    logger.info({ 
      sourceId: created.id, 
      provider: created.provider,
      dataType: created.dataType 
    }, 'External data source created');

    return created;
  }

  async updateDataSource(id: string, updates: Partial<InsertExternalDataSource>): Promise<ExternalDataSource> {
    if (updates.apiConfig) {
      await this.validateDataSourceConfig(updates as InsertExternalDataSource);
    }

    const [updated] = await db
      .update(externalDataSources)
      .set(updates)
      .where(eq(externalDataSources.id, id))
      .returning();

    return updated;
  }

  async syncDataSource(id: string): Promise<{ success: boolean; recordsUpdated: number; errors: string[] }> {
    const [source] = await db
      .select()
      .from(externalDataSources)
      .where(eq(externalDataSources.id, id))
      .limit(1);

    if (!source) {
      throw new Error('Data source not found');
    }

    if (!source.isActive) {
      throw new Error('Data source is not active');
    }

    try {
      await db
        .update(externalDataSources)
        .set({ lastSyncStatus: 'syncing' })
        .where(eq(externalDataSources.id, id));

      let recordsUpdated = 0;
      const errors: string[] = [];

      switch (source.provider) {
        case 'world_bank':
          recordsUpdated = await this.syncWorldBankData(source);
          break;
        case 'oecd':
          recordsUpdated = await this.syncOECDData(source);
          break;
        case 'local_regulatory':
          recordsUpdated = await this.syncLocalRegulatoryData(source);
          break;
        default:
          throw new Error(`Unsupported provider: ${source.provider}`);
      }

      await db
        .update(externalDataSources)
        .set({ 
          lastSyncAt: new Date(),
          lastSyncStatus: 'success'
        })
        .where(eq(externalDataSources.id, id));

      logger.info({ 
        sourceId: id, 
        provider: source.provider,
        recordsUpdated 
      }, 'Data source sync completed');

      return { success: true, recordsUpdated, errors };

    } catch (error) {
      await db
        .update(externalDataSources)
        .set({ 
          lastSyncAt: new Date(),
          lastSyncStatus: 'failed'
        })
        .where(eq(externalDataSources.id, id));

      logger.error({ error, sourceId: id }, 'Data source sync failed');

      return { 
        success: false, 
        recordsUpdated: 0, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }

  async syncAllDataSources(): Promise<{ 
    totalSources: number; 
    successful: number; 
    failed: number; 
    results: Array<{ sourceId: string; success: boolean; recordsUpdated: number; errors: string[] }> 
  }> {
    const activeSources = await this.getDataSources({ isActive: true });
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const source of activeSources) {
      try {
        const result = await this.syncDataSource(source.id);
        results.push({ sourceId: source.id, ...result });
        
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        results.push({
          sourceId: source.id,
          success: false,
          recordsUpdated: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
        failed++;
      }
    }

    logger.info({ 
      totalSources: activeSources.length, 
      successful, 
      failed 
    }, 'Bulk data source sync completed');

    return {
      totalSources: activeSources.length,
      successful,
      failed,
      results,
    };
  }

  async getRiskData(country: string, dataTypes?: string[]): Promise<RiskIndicator[]> {
    const conditions = [
      eq(riskDataCache.country, country),
      sql`${riskDataCache.expiresAt} > NOW()`
    ];

    if (dataTypes && dataTypes.length > 0) {
      conditions.push(sql`${externalDataSources.dataType} = ANY(${dataTypes})`);
    }

    const cachedData = await db
      .select({
        id: riskDataCache.id,
        dataSourceId: riskDataCache.dataSourceId,
        country: riskDataCache.country,
        dataKey: riskDataCache.dataKey,
        data: riskDataCache.data,
        score: riskDataCache.score,
        confidence: riskDataCache.confidence,
        expiresAt: riskDataCache.expiresAt,
        createdAt: riskDataCache.createdAt,
      })
      .from(riskDataCache)
      .innerJoin(externalDataSources, eq(riskDataCache.dataSourceId, externalDataSources.id))
      .where(and(...conditions));

    return cachedData.map(item => ({
      source: item.dataKey,
      indicator: item.dataKey,
      value: item.score || 0,
      confidence: item.confidence || 100,
      lastUpdated: item.createdAt,
    }));
  }

  private async syncWorldBankData(source: ExternalDataSource): Promise<number> {
    const config = source.apiConfig as DataSourceConfig;
    let recordsUpdated = 0;

    // World Bank indicators that are relevant for risk assessment
    const indicators = [
      'NY.GDP.PCAP.CD', // GDP per capita
      'CC.EST', // Control of Corruption
      'RL.EST', // Rule of Law
      'PV.EST', // Political Stability and Absence of Violence
      'GE.EST', // Government Effectiveness
      'RQ.EST', // Regulatory Quality
      'VA.EST', // Voice and Accountability
    ];

    const countries = source.country ? [source.country] : await this.getAllCountryCodes();

    for (const country of countries) {
      for (const indicator of indicators) {
        try {
          const url = `${config.baseUrl}/v2/country/${country}/indicator/${indicator}?format=json&date=2020:2023&per_page=10`;
          
          const response = await this.makeRateLimitedRequest(source.id, url);
          const data = await response.json() as WorldBankData[][];
          
          if (Array.isArray(data) && data[1] && Array.isArray(data[1])) {
            const latestData = data[1][0]; // Most recent data point
            
            if (latestData && latestData.value !== null) {
              const normalizedScore = this.normalizeWorldBankScore(indicator, latestData.value);
              
              await this.cacheRiskData({
                dataSourceId: source.id,
                country,
                dataKey: `${indicator}_${latestData.date}`,
                data: latestData,
                score: normalizedScore,
                confidence: 85, // World Bank data is generally reliable
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              });
              
              recordsUpdated++;
            }
          }
        } catch (error) {
          logger.warn({ error, country, indicator }, 'Failed to sync World Bank data point');
        }
      }
    }

    return recordsUpdated;
  }

  private async syncOECDData(source: ExternalDataSource): Promise<number> {
    const config = source.apiConfig as DataSourceConfig;
    let recordsUpdated = 0;

    // OECD datasets for risk assessment
    const datasets = [
      'MEI', // Main Economic Indicators
      'QNA', // Quarterly National Accounts
      'PATS_IPC', // Patents by IPC
    ];

    for (const dataset of datasets) {
      try {
        const url = `${config.baseUrl}/sdmx-json/data/${dataset}`;
        const response = await this.makeRateLimitedRequest(source.id, url, {
          'Accept': 'application/vnd.sdmx.data+json;version=1.0.0-wd',
          ...(config.headers || {}),
        });
        
        const data = await response.json() as OECDData;
        
        // Process OECD data structure (simplified)
        if (data.dataSets && data.dataSets[0] && data.dataSets[0].observations) {
          const observations = data.dataSets[0].observations;
          
          for (const [key, value] of Object.entries(observations)) {
            if (value[0] !== null) {
              await this.cacheRiskData({
                dataSourceId: source.id,
                country: source.country || 'GLOBAL',
                dataKey: `${dataset}_${key}`,
                data: { dataset, key, value: value[0] },
                score: Math.min(Math.max(value[0] * 10, 0), 100), // Simple normalization
                confidence: 80,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
              });
              
              recordsUpdated++;
            }
          }
        }
      } catch (error) {
        logger.warn({ error, dataset }, 'Failed to sync OECD data');
      }
    }

    return recordsUpdated;
  }

  private async syncLocalRegulatoryData(source: ExternalDataSource): Promise<number> {
    // This would integrate with local regulatory APIs
    // Implementation would depend on specific country's regulatory data APIs
    logger.info({ sourceId: source.id }, 'Local regulatory data sync not implemented');
    return 0;
  }

  private async makeRateLimitedRequest(
    sourceId: string, 
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<any> {
    // Check rate limits
    await this.checkRateLimit(sourceId);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Deel-Risk-Checker/1.0',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  private async checkRateLimit(sourceId: string): Promise<void> {
    const now = new Date();
    const counter = this.requestCounters.get(sourceId) || {
      minute: 0,
      hour: 0,
      lastReset: now,
    };

    // Reset counters if needed
    const timeSinceReset = now.getTime() - counter.lastReset.getTime();
    if (timeSinceReset > 60 * 1000) { // 1 minute
      counter.minute = 0;
    }
    if (timeSinceReset > 60 * 60 * 1000) { // 1 hour
      counter.hour = 0;
      counter.lastReset = now;
    }

    // Check limits (conservative defaults)
    if (counter.minute >= 60) { // 60 requests per minute
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (counter.hour >= 1000) { // 1000 requests per hour
      throw new Error('Hourly rate limit exceeded');
    }

    // Increment counters
    counter.minute++;
    counter.hour++;
    this.requestCounters.set(sourceId, counter);
  }

  private async cacheRiskData(data: InsertRiskDataCache): Promise<void> {
    // Remove existing cache entry for the same data key
    await db
      .delete(riskDataCache)
      .where(
        and(
          eq(riskDataCache.dataSourceId, data.dataSourceId),
          eq(riskDataCache.dataKey, data.dataKey)
        )
      );

    // Insert new cache entry
    await db
      .insert(riskDataCache)
      .values(data);
  }

  private normalizeWorldBankScore(indicator: string, value: number): number {
    // Normalize different World Bank indicators to 0-100 risk scale
    switch (indicator) {
      case 'CC.EST': // Control of Corruption (-2.5 to 2.5, higher is better)
      case 'RL.EST': // Rule of Law
      case 'PV.EST': // Political Stability
      case 'GE.EST': // Government Effectiveness  
      case 'RQ.EST': // Regulatory Quality
      case 'VA.EST': // Voice and Accountability
        // Convert -2.5 to 2.5 scale to 100 to 0 risk scale (higher governance = lower risk)
        return Math.max(0, Math.min(100, (2.5 - value) * 20));
      
      case 'NY.GDP.PCAP.CD': // GDP per capita (higher GDP = lower risk)
        // Normalize GDP to risk scale (simplified)
        if (value > 50000) return 0; // Very low risk
        if (value > 25000) return 20;
        if (value > 10000) return 40;
        if (value > 5000) return 60;
        if (value > 1000) return 80;
        return 100; // High risk for very low GDP
      
      default:
        return 50; // Neutral if we don't know how to normalize
    }
  }

  private async getAllCountryCodes(): Promise<string[]> {
    const result = await db
      .select({ iso: countries.iso })
      .from(countries);
    
    return result.map(r => r.iso);
  }

  private async validateDataSourceConfig(sourceData: InsertExternalDataSource): Promise<void> {
    const config = sourceData.apiConfig as DataSourceConfig;
    
    if (!config.baseUrl) {
      throw new Error('Base URL is required in API configuration');
    }

    // Test the API connection
    try {
      const response = await fetch(config.baseUrl, { 
        method: 'HEAD',
        timeout: 5000 
      } as any);
      
      if (!response.ok && response.status !== 405) { // 405 Method Not Allowed is OK for HEAD
        throw new Error(`API endpoint test failed: ${response.status}`);
      }
    } catch (error) {
      logger.warn({ error, baseUrl: config.baseUrl }, 'API endpoint test failed');
      // Don't throw error, just warn - some APIs may not support HEAD requests
    }
  }
}

export const externalDataService = new ExternalDataService();