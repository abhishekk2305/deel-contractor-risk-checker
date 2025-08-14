import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SearchFilters } from "@/types";

export const useCountries = (filters: SearchFilters) => {
  return useQuery({
    queryKey: ["/api/countries", filters],
    queryFn: () => api.searchCountries(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCountry = (iso: string) => {
  return useQuery({
    queryKey: ["/api/countries", iso],
    queryFn: () => api.getCountry(iso),
    enabled: !!iso,
    staleTime: 5 * 60 * 1000,
  });
};

export const useFeaturedCountries = () => {
  return useQuery({
    queryKey: ["/api/countries/featured"],
    queryFn: () => api.getFeaturedCountries(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
