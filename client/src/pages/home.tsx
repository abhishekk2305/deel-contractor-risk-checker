import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, Users, FileText, BarChart3, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatScore } from '@/lib/formatters';

interface Country {
  id: string;
  iso: string;
  name: string;
  flag?: string;
  lastUpdated: string;
}

interface AnalyticsData {
  searchCount: number;
  riskCheckCount: number;
  pdfGenerationCount: number;
  rulePublishCount: number;
  topCountries: Array<{ country: string; count: number }>;
  riskTierDistribution: Array<{ tier: string; count: number }>;
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: analyticsData } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
  });

  const { data: countriesData } = useQuery({
    queryKey: ['countries', { popular: true, limit: 6, window: '7d' }],
    queryFn: async () => {
      const response = await fetch('/api/countries/popular?window=7d&limit=6');
      if (!response.ok) throw new Error('Failed to fetch popular countries');
      return response.json();
    },
  });

  const countries: Country[] = countriesData?.countries || [];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">
                  Global Contractor Risk Checker
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/analytics">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </Link>
              <Link href="/admin-rules">
                <Button variant="ghost" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Assess Global Contractor Risk
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Comprehensive risk analysis across 195+ countries with real-time compliance data
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search countries (e.g., United States, DE, Canada)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-12 pr-24 h-12 text-lg"
              />
              <Button 
                onClick={handleSearch}
                className="absolute right-2 top-2 h-8"
                disabled={!searchQuery.trim()}
              >
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {analyticsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Total Searches</h3>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.searchCount}</div>
                <p className="text-xs text-muted-foreground">
                  Country searches performed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Risk Assessments</h3>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.riskCheckCount}</div>
                <p className="text-xs text-muted-foreground">
                  Contractor risk checks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">PDF Reports</h3>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.pdfGenerationCount}</div>
                <p className="text-xs text-muted-foreground">
                  Reports generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Rules Published</h3>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.rulePublishCount}</div>
                <p className="text-xs text-muted-foreground">
                  Compliance rules active
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Popular Countries */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Popular Countries</h2>
            <div className="text-sm text-gray-500 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="cursor-help" title="Ranked by searches in the last 7 days">
                Ranked by searches in the last 7 days
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {countries.slice(0, 6).map((country, index) => (
              <Link key={country.id} href={`/country/${country.iso.toLowerCase()}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                          #{index + 1}
                        </span>
                        <h3 className="text-lg font-semibold">{country.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{country.iso}</Badge>
                        {(country as any).searchCount && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {Math.round((country as any).searchCount)} searches
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Updated {formatDate(country.lastUpdated)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Start Risk Assessment
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Analyze contractor risk across multiple compliance dimensions with real-time data integration.
              </p>
              <Link href="/search">
                <Button className="w-full">
                  Begin Assessment
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                View Analytics
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Explore comprehensive analytics and insights from global contractor risk assessments.
              </p>
              <Link href="/analytics">
                <Button variant="outline" className="w-full">
                  View Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Risk Tier Distribution */}
        {analyticsData && analyticsData.riskTierDistribution.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Risk Distribution</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {analyticsData.riskTierDistribution.map((tier) => (
                <Card key={tier.tier}>
                  <CardContent className="p-6 text-center">
                    <div className={`text-3xl font-bold mb-2 ${
                      tier.tier === 'low' ? 'text-green-600' :
                      tier.tier === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(tier.count)}
                    </div>
                    <div className={`text-sm font-medium uppercase tracking-wide ${
                      tier.tier === 'low' ? 'text-green-600' :
                      tier.tier === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {tier.tier} Risk
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}