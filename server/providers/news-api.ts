import { createChildLogger } from "../lib/logger";

const logger = createChildLogger('news-api');

export interface AdverseMediaResult {
  hasAdverseMedia: boolean;
  riskScore: number; // 0-100
  confidence: number;
  sources: string[];
  articles: Array<{
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    sentiment: 'negative' | 'neutral' | 'positive';
  }>;
}

export class NewsAPIProvider {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.apiKey = process.env.NEWSAPI_API_KEY || '';
    this.baseUrl = 'https://newsapi.org/v2';
    this.timeout = parseInt(process.env.NEWSAPI_TIMEOUT || '8000');
  }

  async checkAdverseMedia(
    contractorName: string,
    countryCode: string
  ): Promise<AdverseMediaResult> {
    const startTime = Date.now();
    
    try {
      logger.info({ 
        contractorName, 
        countryCode, 
        provider: 'newsapi' 
      }, 'Starting adverse media check');

      // If no API key, use mock data
      if (!this.apiKey) {
        logger.warn('NewsAPI key not configured, using mock data');
        return this.getMockAdverseMediaResult(contractorName, countryCode);
      }

      // Search for negative news about the contractor
      const searchQueries = [
        `"${contractorName}" AND (fraud OR lawsuit OR criminal OR investigation OR violation)`,
        `"${contractorName}" AND (penalty OR fine OR sanction OR breach)`
      ];

      const results = await Promise.allSettled(
        searchQueries.map(query => this.searchNews(query, countryCode))
      );

      const allArticles: any[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allArticles.push(...result.value);
        }
      }

      const duration = Date.now() - startTime;
      logger.info({ 
        duration, 
        articlesFound: allArticles.length 
      }, 'NewsAPI check completed');

      return this.parseNewsResults(allArticles, contractorName);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn({ duration, timeout: this.timeout }, 'NewsAPI request timeout');
        
        // Return partial result on timeout
        return {
          hasAdverseMedia: false,
          riskScore: 0,
          confidence: 0,
          sources: ['newsapi-timeout'],
          articles: []
        };
      }

      logger.error({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration 
      }, 'NewsAPI check failed');
      
      throw error;
    }
  }

  private async searchNews(query: string, countryCode: string): Promise<any[]> {
    const params = new URLSearchParams({
      q: query,
      sortBy: 'relevancy',
      pageSize: '10',
      language: 'en',
      from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last year
    });

    // Add country-specific domains if available
    const countryDomains: Record<string, string> = {
      'US': 'cnn.com,nytimes.com,wsj.com',
      'GB': 'bbc.co.uk,theguardian.com,ft.com',
      'DE': 'spiegel.de,zeit.de',
      'FR': 'lemonde.fr,lefigaro.fr'
    };

    if (countryDomains[countryCode]) {
      params.append('domains', countryDomains[countryCode]);
    }

    logger.debug({ query, params: params.toString() }, 'NewsAPI search parameters');

    const response = await fetch(`${this.baseUrl}/everything?${params}`, {
      headers: {
        'X-API-Key': this.apiKey,
      },
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      if (response.status === 429) {
        logger.warn('NewsAPI rate limit exceeded');
        return [];
      }
      throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.articles || [];
  }

  private parseNewsResults(articles: any[], contractorName: string): AdverseMediaResult {
    if (articles.length === 0) {
      return {
        hasAdverseMedia: false,
        riskScore: 0,
        confidence: 100,
        sources: ['newsapi'],
        articles: []
      };
    }

    // Analyze articles for adverse content
    const adverseKeywords = [
      'fraud', 'lawsuit', 'criminal', 'investigation', 'violation',
      'penalty', 'fine', 'sanction', 'breach', 'misconduct',
      'illegal', 'corrupt', 'embezzle', 'bribe'
    ];

    let riskScore = 0;
    let adverseCount = 0;
    const processedArticles: any[] = [];

    for (const article of articles) {
      const content = `${article.title} ${article.description}`.toLowerCase();
      const adverseMatches = adverseKeywords.filter(keyword => 
        content.includes(keyword)
      );

      let sentiment: 'negative' | 'neutral' | 'positive' = 'neutral';
      let articleRisk = 0;

      if (adverseMatches.length > 0) {
        sentiment = 'negative';
        articleRisk = Math.min(100, adverseMatches.length * 15);
        adverseCount++;
      }

      // Check if contractor name appears prominently
      const nameInTitle = article.title?.toLowerCase().includes(contractorName.toLowerCase());
      if (nameInTitle && sentiment === 'negative') {
        articleRisk *= 1.5; // Increase risk if name in title
      }

      riskScore = Math.max(riskScore, articleRisk);

      processedArticles.push({
        title: article.title,
        description: article.description,
        url: article.url,
        publishedAt: article.publishedAt,
        sentiment
      });
    }

    // Calculate final risk score
    const hasAdverseMedia = adverseCount > 0;
    if (hasAdverseMedia) {
      riskScore = Math.min(100, riskScore + (adverseCount * 5));
    }

    // Calculate confidence based on article relevance and recency
    const confidence = Math.min(100, 60 + (articles.length * 5));

    return {
      hasAdverseMedia,
      riskScore: Math.round(riskScore),
      confidence,
      sources: ['newsapi'],
      articles: processedArticles.slice(0, 5) // Return top 5 most relevant
    };
  }

  private getMockAdverseMediaResult(contractorName: string, countryCode: string): AdverseMediaResult {
    // Generate deterministic mock data based on name
    const nameHash = contractorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const riskModifier = nameHash % 100;
    
    // 15% chance of adverse media
    const hasAdverseMedia = riskModifier < 15;
    
    let riskScore = 0;
    let articles: any[] = [];
    
    if (hasAdverseMedia) {
      riskScore = 20 + (riskModifier % 40); // 20-60 range
      
      // Mock adverse articles
      articles = [
        {
          title: `${contractorName} faces compliance investigation`,
          description: `Regulatory authorities are investigating ${contractorName} for potential compliance violations...`,
          url: 'https://example-news.com/article1',
          publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          sentiment: 'negative' as const
        },
        {
          title: `Business dispute involving ${contractorName}`,
          description: `A commercial dispute has emerged involving ${contractorName} and industry practices...`,
          url: 'https://example-news.com/article2',
          publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          sentiment: 'negative' as const
        }
      ];
    }

    return {
      hasAdverseMedia,
      riskScore,
      confidence: 85,
      sources: ['newsapi-mock'],
      articles
    };
  }

  // Simulate timeout for testing partial sources
  async checkAdverseMediaWithTimeout(
    contractorName: string,
    countryCode: string,
    timeoutMs: number = 100
  ): Promise<AdverseMediaResult> {
    const originalTimeout = this.timeout;
    this.timeout = timeoutMs;
    
    try {
      return await this.checkAdverseMedia(contractorName, countryCode);
    } catch (error) {
      // Return partial result indicating timeout
      return {
        hasAdverseMedia: false,
        riskScore: 0,
        confidence: 0,
        sources: ['newsapi-timeout'],
        articles: []
      };
    } finally {
      this.timeout = originalTimeout;
    }
  }

  getProviderInfo() {
    return {
      name: 'NewsAPI',
      type: 'adverse-media',
      configured: !!this.apiKey,
      baseUrl: this.baseUrl,
      timeout: this.timeout
    };
  }
}

export const newsAPIProvider = new NewsAPIProvider();