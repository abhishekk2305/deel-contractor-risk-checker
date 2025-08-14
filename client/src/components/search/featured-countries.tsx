import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/shared/risk-badge";
import { CountryCardSkeleton } from "@/components/shared/loading-skeleton";
import { Country } from "@/types";
import { analytics } from "@/lib/analytics";

interface FeaturedCountriesProps {
  countries: Country[];
  isLoading: boolean;
  onCountryClick: (country: Country) => void;
}

export function FeaturedCountries({ countries, isLoading, onCountryClick }: FeaturedCountriesProps) {
  const handleCountryClick = (country: Country) => {
    analytics.countryView(country.iso, country.name);
    onCountryClick(country);
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Featured Countries</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CountryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Featured Countries</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {countries.map((country) => (
          <Card
            key={country.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleCountryClick(country)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {country.flag || country.iso}
                    </span>
                  </div>
                  <span className="font-medium">{country.name}</span>
                </div>
                {country.riskLevel && (
                  <RiskBadge level={country.riskLevel} score={country.riskScore} size="sm" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {country.topRiskFactors?.join(', ') || 'No specific risk factors identified'}
              </p>
              <div className="text-xs text-gray-500">
                Last updated: {new Date(country.lastUpdated).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
