import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useAnalytics = (from?: string, to?: string) => {
  return useQuery({
    queryKey: ["/api/admin/analytics", from, to],
    queryFn: () => api.getAnalytics(from, to),
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
