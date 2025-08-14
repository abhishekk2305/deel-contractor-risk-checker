import { useState } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/layout/navigation";
import { SearchBar } from "@/components/search/search-bar";
import { FilterChips } from "@/components/search/filter-chips";
import { CountryTable } from "@/components/search/country-table";
import { RiskCheckModal } from "@/components/modals/risk-check-modal";
import { PdfModal } from "@/components/modals/pdf-modal";
import { useCountries } from "@/hooks/use-countries";
import { SearchFilters, Country } from "@/types";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    contractorType: 'all',
    paymentMethod: 'all',
    riskLevel: 'all',
    page: 1,
    pageSize: 10,
    sort: 'name',
  });

  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const { data: countriesData, isLoading: countriesLoading, refetch } = useCountries(filters);

  const handleSearch = () => {
    refetch();
  };

  const handleFilterRemove = (field: keyof SearchFilters) => {
    const newFilters = { ...filters };
    if (field === 'contractorType' || field === 'paymentMethod' || field === 'riskLevel') {
      newFilters[field] = 'all';
    } else {
      delete newFilters[field];
    }
    setFilters(newFilters);
  };

  const handleCountryClick = (country: Country) => {
    setLocation(`/country/${country.iso}`);
  };

  const handleRiskCheckClick = (country: Country) => {
    setSelectedCountry(country);
    setShowRiskModal(true);
  };

  const handleTabChange = (tabId: string) => {
    switch (tabId) {
      case 'search':
        setLocation('/');
        break;
      case 'countries':
        setLocation('/search');
        break;
      case 'admin':
        setLocation('/admin');
        break;
      case 'analytics':
        setLocation('/analytics');
        break;
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Navigation activeTab="countries" onTabChange={handleTabChange} />
      
      <SearchBar
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        isLoading={countriesLoading}
      />

      <FilterChips filters={filters} onFilterRemove={handleFilterRemove} />

      <CountryTable
        data={countriesData}
        isLoading={countriesLoading}
        filters={filters}
        onFiltersChange={setFilters}
        onCountryClick={handleCountryClick}
        onRiskCheckClick={handleRiskCheckClick}
      />

      <RiskCheckModal
        isOpen={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        country={selectedCountry}
        onSuccess={() => {
          setShowRiskModal(false);
          setShowPdfModal(true);
        }}
      />

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        country={selectedCountry}
      />
    </main>
  );
}
