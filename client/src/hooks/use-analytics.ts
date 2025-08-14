import { useQuery } from "@tanstack/react-query";

export const useAnalytics = (from?: string, to?: string) => {
  return useQuery({
    queryKey: ["/api/analytics", from, to],
    queryFn: async () => {
      const response = await fetch('/api/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};

export const useComplianceRules = (countryIso?: string, status?: string) => {
  return useQuery({
    queryKey: ["/api/admin/rules", countryIso, status],
    queryFn: () => api.getComplianceRules(countryIso, status),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
