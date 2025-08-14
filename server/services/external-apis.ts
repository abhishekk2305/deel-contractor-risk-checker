import { createChildLogger } from '../lib/logger';

const logger = createChildLogger('external-apis');

interface SanctionsCheckRequest {
  name: string;
  country: string;
  registrationId?: string;
}

interface SanctionsCheckResult {
  hitsCount: number;
  categories: string[];
  matches: Array<{
    name: string;
    listType: string;
    confidence: number;
  }>;
}

interface PEPCheckRequest {
  name: string;
  country: string;
}

interface PEPCheckResult {
  isPEP: boolean;
  confidence: number;
  positions: string[];
}

interface AdverseMediaRequest {
  name: string;
  country: string;
}

interface AdverseMediaResult {
  mentionsCount: number;
  topKeywords: string[];
  articles: Array<{
    title: string;
    source: string;
    date: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
}

class ExternalAPIs {
  private sanctionsApiKey: string;
  private newsApiKey: string;
  private requestTimeout: number = 5000; // 5 seconds
  private maxRetries: number = 3;

  constructor() {
    this.sanctionsApiKey = process.env.SANCTIONS_API_KEY || process.env.COMPLY_ADVANTAGE_API_KEY || '';
    this.newsApiKey = process.env.NEWS_API_KEY || '';

    if (!this.sanctionsApiKey) {
      logger.warn('Sanctions API key not configured');
    }
    if (!this.newsApiKey) {
      logger.warn('News API key not configured');
    }
  }

  async checkSanctions(request: SanctionsCheckRequest): Promise<SanctionsCheckResult> {
    if (!this.sanctionsApiKey) {
      logger.warn('Sanctions API key not available, using fallback');
      return this.getFallbackSanctionsResult();
    }

    try {
      logger.info({ name: request.name, country: request.country }, 'Checking sanctions');

      const response = await this.makeRequest('https://api.complyadvantage.com/searches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sanctionsApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          search_term: request.name,
          fuzziness: 0.8,
          filters: {
            birth_year: [],
            country_codes: [request.country],
            types: ['sanction', 'warning', 'fitness-probity'],
          },
          share_url: false,
        }),
      });

      const data = await response.json();

      const result: SanctionsCheckResult = {
        hitsCount: data.hits?.length || 0,
        categories: data.hits?.map((hit: any) => hit.types).flat() || [],
        matches: data.hits?.map((hit: any) => ({
          name: hit.name,
          listType: hit.types?.[0] || 'unknown',
          confidence: hit.match_strength || 0,
        })) || [],
      };

      logger.info({ 
        name: request.name, 
        hitsCount: result.hitsCount 
      }, 'Sanctions check completed');

      return result;

    } catch (error) {
      logger.error({ error, request }, 'Sanctions check failed');
      return this.getFallbackSanctionsResult();
    }
  }

  async checkPEP(request: PEPCheckRequest): Promise<PEPCheckResult> {
    if (!this.sanctionsApiKey) {
      logger.warn('Sanctions API key not available, using fallback');
      return this.getFallbackPEPResult();
    }

    try {
      logger.info({ name: request.name, country: request.country }, 'Checking PEP status');

      const response = await this.makeRequest('https://api.complyadvantage.com/searches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sanctionsApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          search_term: request.name,
          fuzziness: 0.8,
          filters: {
            country_codes: [request.country],
            types: ['pep'],
          },
          share_url: false,
        }),
      });

      const data = await response.json();
      const pepHits = data.hits?.filter((hit: any) => hit.types?.includes('pep')) || [];

      const result: PEPCheckResult = {
        isPEP: pepHits.length > 0,
        confidence: pepHits.length > 0 ? Math.max(...pepHits.map((hit: any) => hit.match_strength || 0)) : 0,
        positions: pepHits.map((hit: any) => hit.fields?.position).filter(Boolean) || [],
      };

      logger.info({ 
        name: request.name, 
        isPEP: result.isPEP 
      }, 'PEP check completed');

      return result;

    } catch (error) {
      logger.error({ error, request }, 'PEP check failed');
      return this.getFallbackPEPResult();
    }
  }

  async checkAdverseMedia(request: AdverseMediaRequest): Promise<AdverseMediaResult> {
    if (!this.newsApiKey) {
      logger.warn('News API key not available, using fallback');
      return this.getFallbackAdverseMediaResult();
    }

    try {
      logger.info({ name: request.name, country: request.country }, 'Checking adverse media');

      // Search for negative terms related to the person/entity
      const searchTerms = [
        `"${request.name}" AND (fraud OR corruption OR scandal OR investigation)`,
        `"${request.name}" AND (lawsuit OR criminal OR illegal OR violation)`,
        `"${request.name}" AND (sanctions OR penalty OR fine OR enforcement)`,
      ];

      const allArticles: any[] = [];

      for (const searchTerm of searchTerms) {
        try {
          const response = await this.makeRequest(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchTerm)}&sortBy=relevancy&pageSize=10&language=en`,
            {
              headers: {
                'X-API-Key': this.newsApiKey,
              },
            }
          );

          const data = await response.json();
          
          if (data.articles && Array.isArray(data.articles)) {
            allArticles.push(...data.articles);
          }
        } catch (searchError) {
          logger.warn({ error: searchError, searchTerm }, 'Individual search failed');
        }
      }

      // Remove duplicates and analyze sentiment
      const uniqueArticles = this.deduplicateArticles(allArticles);
      const processedArticles = uniqueArticles.map(article => ({
        title: article.title,
        source: article.source?.name || 'Unknown',
        date: article.publishedAt,
        sentiment: this.analyzeSentiment(article.title + ' ' + (article.description || '')) as 'positive' | 'negative' | 'neutral',
      }));

      // Extract keywords
      const allText = uniqueArticles.map(a => (a.title || '') + ' ' + (a.description || '')).join(' ');
      const keywords = this.extractKeywords(allText);

      const result: AdverseMediaResult = {
        mentionsCount: uniqueArticles.length,
        topKeywords: keywords.slice(0, 10),
        articles: processedArticles.slice(0, 20),
      };

      logger.info({ 
        name: request.name, 
        mentionsCount: result.mentionsCount 
      }, 'Adverse media check completed');

      return result;

    } catch (error) {
      logger.error({ error, request }, 'Adverse media check failed');
      return this.getFallbackAdverseMediaResult();
    }
  }

  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getFallbackSanctionsResult(): SanctionsCheckResult {
    return {
      hitsCount: 0,
      categories: [],
      matches: [],
    };
  }

  private getFallbackPEPResult(): PEPCheckResult {
    return {
      isPEP: false,
      confidence: 0,
      positions: [],
    };
  }

  private getFallbackAdverseMediaResult(): AdverseMediaResult {
    return {
      mentionsCount: 0,
      topKeywords: [],
      articles: [],
    };
  }

  private deduplicateArticles(articles: any[]): any[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const key = article.title?.toLowerCase() || '';
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private analyzeSentiment(text: string): string {
    const negativeWords = [
      'fraud', 'corruption', 'scandal', 'investigation', 'lawsuit', 'criminal',
      'illegal', 'violation', 'sanctions', 'penalty', 'fine', 'enforcement',
      'charged', 'accused', 'convicted', 'guilty', 'arrested', 'indicted',
      'money laundering', 'bribery', 'embezzlement', 'tax evasion',
    ];

    const positiveWords = [
      'cleared', 'exonerated', 'acquitted', 'dismissed', 'vindicated',
      'award', 'honored', 'recognized', 'achievement', 'success',
    ];

    const lowerText = text.toLowerCase();
    
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;

    if (negativeCount > positiveCount) return 'negative';
    if (positiveCount > negativeCount) return 'positive';
    return 'neutral';
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'about', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'the', 'a', 'an',
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }
}

export const externalApis = new ExternalAPIs();
