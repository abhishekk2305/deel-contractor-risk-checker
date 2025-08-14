export interface Country {
  id: string;
  iso: string;
  name: string;
  flag?: string;
  lastUpdated: string;
  riskLevel?: 'low' | 'medium' | 'high';
  riskScore?: number;
  topRiskFactors?: string[];
}

export interface RiskFactor {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  sourceUrl?: string;
}

export interface RiskAssessment {
  id: string;
  contractorId: string;
  score: number;
  tier: 'low' | 'medium' | 'high';
  topRisks: RiskFactor[];
  recommendations: string[];
  penaltyRange: string;
  partialSources: string[];
  breakdown: {
    sanctions: number;
    pep: number;
    adverseMedia: number;
    internalHistory: number;
    countryBaseline: number;
  };
  rulesetVersion: number;
  createdAt: string;
}

export interface ComplianceRule {
  id: string;
  countryId: string;
  ruleType: string;
  description: string;
  severity: number;
  effectiveFrom: string;
  sourceUrl?: string;
  status: 'draft' | 'published';
  version: number;
  updatedAt: string;
}

export interface SearchFilters {
  query?: string;
  contractorType?: 'independent' | 'eor' | 'freelancer' | 'all';
  paymentMethod?: 'wire' | 'ach' | 'crypto' | 'paypal' | 'all';
  riskLevel?: 'low' | 'medium' | 'high' | 'all';
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'risk' | 'updated';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AnalyticsData {
  totalSearches: number;
  riskAssessments: number;
  pdfReports: number;
  avgResponseTime: number;
  searchesChange: number;
  assessmentsChange: number;
  reportsChange: number;
  responseTimeChange: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  topRiskFactors: Array<{
    name: string;
    percentage: number;
  }>;
  topCountries: Array<{
    country: Country;
    searches: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'search' | 'assessment' | 'pdf' | 'rule' | 'user';
    description: string;
    timestamp: string;
  }>;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}
