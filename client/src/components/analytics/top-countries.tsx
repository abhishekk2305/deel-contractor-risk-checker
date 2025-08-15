import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/shared/loading-skeleton";
import { AnalyticsData } from "@/types";

interface TopCountriesProps {
  data: any;
  isLoading: boolean;
}

export function TopCountries({ data, isLoading }: TopCountriesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Most Searched Countries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                  <div className="h-1 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topCountries = data?.topCountries || [];
  const totalSearches = topCountries.reduce((sum: number, item: any) => sum + (item.count || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Searched Countries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topCountries.length > 0 ? (
            topCountries.map((item: any, index: number) => {
              const countryFlag = item.country === 'United States' ? '🇺🇸' :
                                 item.country === 'United Kingdom' ? '🇬🇧' :
                                 item.country === 'Germany' ? '🇩🇪' :
                                 item.country === 'Canada' ? '🇨🇦' :
                                 item.country === 'Australia' ? '🇦🇺' :
                                 item.country === 'India' ? '🇮🇳' :
                                 item.country === 'France' ? '🇫🇷' : '🌍';
              const searches = Math.round(item.count || 0);
              const percentage = totalSearches > 0 ? (searches / totalSearches) * 100 : 0;
              
              return (
                <div key={`${item.country}-${index}`} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{countryFlag}</span>
                    <div>
                      <p className="font-medium text-gray-900">{item.country}</p>
                      <p className="text-sm text-gray-500">
                        {searches.toLocaleString()} searches
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {percentage.toFixed(1)}%
                    </p>
                    <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                      <div 
                        className="h-full bg-deel-primary rounded-full"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              No search data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
