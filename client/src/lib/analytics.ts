declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, any> }) => void;
  }
}

export const analytics = {
  track: (event: string, props?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible(event, { props });
    }
  },

  // Search events
  searchSubmit: (query: string, filters: Record<string, any>) => {
    analytics.track('search_submit', { query, ...filters });
  },

  filterChange: (filterType: string, value: string) => {
    analytics.track('filter_change', { filterType, value });
  },

  countryView: (countryIso: string, countryName: string) => {
    analytics.track('country_view', { countryIso, countryName });
  },

  // Risk assessment events
  riskCheckRequest: (countryIso: string, contractorType: string, paymentMethod: string) => {
    analytics.track('risk_check_request', { countryIso, contractorType, paymentMethod });
  },

  riskCheckSuccess: (countryIso: string, riskTier: string, score: number) => {
    analytics.track('risk_check_success', { countryIso, riskTier, score });
  },

  riskCheckError: (countryIso: string, error: string) => {
    analytics.track('risk_check_error', { countryIso, error });
  },

  // PDF events
  pdfClick: (countryIso: string) => {
    analytics.track('pdf_click', { countryIso });
  },

  pdfGenerate: (countryIso: string) => {
    analytics.track('pdf_generate', { countryIso });
  },

  pdfDownloadSuccess: (countryIso: string, sizeBytes: number) => {
    analytics.track('pdf_download_success', { countryIso, sizeBytes });
  },

  // Admin events
  adminRulePublish: (countryIso: string, ruleType: string, version: number) => {
    analytics.track('admin_rule_publish', { countryIso, ruleType, version });
  },

  adminRuleCreate: (countryIso: string, ruleType: string) => {
    analytics.track('admin_rule_create', { countryIso, ruleType });
  },

  adminRuleUpdate: (ruleId: string, countryIso: string, ruleType: string) => {
    analytics.track('admin_rule_update', { ruleId, countryIso, ruleType });
  },

  adminRuleDelete: (ruleId: string, countryIso: string, ruleType: string) => {
    analytics.track('admin_rule_delete', { ruleId, countryIso, ruleType });
  },
};
