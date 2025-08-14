import { RiskCheckRequest, RiskAssessmentResult } from "@shared/schema";
import { SearchFilters, PaginatedResponse, Country, AnalyticsData, ComplianceRule } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Countries API
  async searchCountries(filters: SearchFilters): Promise<PaginatedResponse<Country>> {
    const params = new URLSearchParams();
    
    if (filters.query) params.append('query', filters.query);
    if (filters.contractorType && filters.contractorType !== 'all') {
      params.append('type', filters.contractorType);
    }
    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      params.append('payment', filters.paymentMethod);
    }
    if (filters.riskLevel && filters.riskLevel !== 'all') {
      params.append('risk', filters.riskLevel);
    }
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.pageSize) params.append('page_size', filters.pageSize.toString());
    if (filters.sort) params.append('sort', filters.sort);

    return this.request<PaginatedResponse<Country>>(`/countries?${params}`);
  }

  async getCountry(iso: string): Promise<Country> {
    return this.request<Country>(`/countries/${iso}`);
  }

  async getFeaturedCountries(): Promise<Country[]> {
    return this.request<Country[]>('/countries/featured');
  }

  // Risk Assessment API
  async runRiskCheck(request: RiskCheckRequest, idempotencyKey?: string): Promise<RiskAssessmentResult> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return this.request<RiskAssessmentResult>('/risk-check', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  }

  // PDF Reports API
  async generatePdfReport(contractorId: string): Promise<{ jobId: string }> {
    return this.request<{ jobId: string }>('/pdf-report', {
      method: 'POST',
      body: JSON.stringify({ contractorId }),
    });
  }

  async getPdfReportStatus(jobId: string): Promise<{ status: string; url?: string; sizeBytes?: number }> {
    return this.request<{ status: string; url?: string; sizeBytes?: number }>(`/pdf-report/${jobId}`);
  }

  // Admin API
  async getComplianceRules(countryIso?: string, status?: string): Promise<ComplianceRule[]> {
    const params = new URLSearchParams();
    if (countryIso) params.append('country', countryIso);
    if (status) params.append('status', status);
    
    return this.request<ComplianceRule[]>(`/admin/rules?${params}`);
  }

  async createComplianceRule(rule: Omit<ComplianceRule, 'id' | 'updatedAt'>): Promise<ComplianceRule> {
    return this.request<ComplianceRule>('/admin/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async updateComplianceRule(id: string, rule: Partial<ComplianceRule>): Promise<ComplianceRule> {
    return this.request<ComplianceRule>(`/admin/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  }

  async publishRule(id: string): Promise<{ rulesetVersion: number }> {
    return this.request<{ rulesetVersion: number }>(`/admin/rules/${id}/publish`, {
      method: 'POST',
    });
  }

  async deleteComplianceRule(id: string): Promise<void> {
    await this.request<void>(`/admin/rules/${id}`, {
      method: 'DELETE',
    });
  }

  // Analytics API
  async getAnalytics(from?: string, to?: string): Promise<AnalyticsData> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    return this.request<AnalyticsData>(`/admin/analytics?${params}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

export const api = new ApiClient();
