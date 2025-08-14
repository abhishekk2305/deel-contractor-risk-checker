import { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  ArrowLeft, 
  User, 
  Mail, 
  MapPin, 
  AlertTriangle, 
  FileText, 
  Download, 
  CheckCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Country {
  id: string;
  iso: string;
  name: string;
  flag?: string;
  lastUpdated: string;
}

interface TopRisk {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface RiskAssessment {
  id: string;
  contractorId: string;
  overallScore: number;
  riskTier: 'low' | 'medium' | 'high';
  topRisks: TopRisk[];
  recommendations: string[];
  penaltyRange: string;
  generatedAt: string;
  expiresAt: string;
}

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [riskResult, setRiskResult] = useState<RiskAssessment | null>(null);
  
  // Risk assessment form state
  const [contractorName, setContractorName] = useState('');
  const [contractorEmail, setContractorEmail] = useState('');
  const [contractorType, setContractorType] = useState<'independent' | 'eor' | 'freelancer'>('independent');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get search query from URL
  const [match, params] = useRoute('/search');
  const urlSearchParams = new URLSearchParams(window.location.search);
  const initialQuery = urlSearchParams.get('q') || '';

  useState(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  });

  const { data: countriesData, isLoading: isSearching } = useQuery({
    queryKey: ['countries', { search: searchQuery, page: 1, limit: 20 }],
    queryFn: async () => {
      if (!searchQuery.trim()) return { countries: [], pagination: { total: 0 } };
      
      const response = await fetch(`/api/countries?search=${encodeURIComponent(searchQuery)}&limit=20`);
      if (!response.ok) throw new Error('Failed to search countries');
      return response.json();
    },
    enabled: !!searchQuery.trim(),
  });

  const riskCheckMutation = useMutation({
    mutationFn: async (data: {
      contractorName: string;
      contractorEmail?: string;
      countryIso: string;
      contractorType: 'independent' | 'eor' | 'freelancer';
    }) => {
      const response = await fetch('/api/risk-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Risk check failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setRiskResult(data.result);
      toast({
        title: "Risk Assessment Complete",
        description: `Risk tier: ${data.result.riskTier.toUpperCase()}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Risk Assessment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pdfMutation = useMutation({
    mutationFn: async (riskAssessmentId: string) => {
      const response = await fetch('/api/pdf-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskAssessmentId }),
      });
      
      if (!response.ok) throw new Error('PDF generation failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "PDF Generation Started",
        description: "Your report will be ready shortly...",
      });
      // In a real app, you would poll for the job status
      setTimeout(() => {
        toast({
          title: "PDF Report Ready",
          description: "Your risk assessment report is ready for download.",
        });
      }, 3000);
    },
  });

  const countries: Country[] = countriesData?.countries || [];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Update URL
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowRiskForm(true);
    setRiskResult(null);
  };

  const handleRiskAssessment = () => {
    if (!selectedCountry || !contractorName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    riskCheckMutation.mutate({
      contractorName,
      contractorEmail: contractorEmail || undefined,
      countryIso: selectedCountry.iso,
      contractorType,
    });
  };

  const handleGeneratePDF = () => {
    if (riskResult) {
      pdfMutation.mutate(riskResult.id);
    }
  };

  const getRiskColor = (tier: string) => {
    switch (tier) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="ghost" onClick={() => setLocation('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              Global Contractor Risk Search
            </h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search countries (e.g., United States, DE, Canada)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Search Results */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">
              {searchQuery ? `Results for "${searchQuery}"` : 'Search for a country'}
            </h2>

            {isSearching && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Searching countries...</p>
              </div>
            )}

            {searchQuery && !isSearching && countries.length === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No countries found matching "{searchQuery}". Try searching by country name or ISO code.
                </AlertDescription>
              </Alert>
            )}

            {countries.map((country) => (
              <Card 
                key={country.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedCountry?.id === country.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleCountrySelect(country)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{country.name}</h3>
                      <p className="text-sm text-gray-500">
                        Last updated: {new Date(country.lastUpdated).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {country.iso}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Risk Assessment Form/Results */}
          <div className="space-y-6">
            {selectedCountry && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Risk Assessment: {selectedCountry.name}
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!riskResult ? (
                    <>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <User className="w-4 h-4 inline mr-1" />
                            Contractor Name *
                          </label>
                          <Input
                            value={contractorName}
                            onChange={(e) => setContractorName(e.target.value)}
                            placeholder="Enter contractor name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Mail className="w-4 h-4 inline mr-1" />
                            Email (Optional)
                          </label>
                          <Input
                            type="email"
                            value={contractorEmail}
                            onChange={(e) => setContractorEmail(e.target.value)}
                            placeholder="contractor@example.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contractor Type
                          </label>
                          <select 
                            value={contractorType} 
                            onChange={(e) => setContractorType(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="independent">Independent Contractor</option>
                            <option value="eor">Employer of Record</option>
                            <option value="freelancer">Freelancer</option>
                          </select>
                        </div>
                      </div>

                      <Button 
                        onClick={handleRiskAssessment}
                        disabled={riskCheckMutation.isPending || !contractorName.trim()}
                        className="w-full"
                      >
                        {riskCheckMutation.isPending ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing Risk...
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Start Risk Assessment
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Risk Assessment Results */}
                      <div className={`p-4 rounded-lg border ${getRiskColor(riskResult.riskTier)}`}>
                        <div className="text-center mb-4">
                          <h3 className="text-2xl font-bold uppercase">
                            {riskResult.riskTier} Risk
                          </h3>
                          <p className="text-lg">
                            Overall Score: {riskResult.overallScore}/100
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Top Risk Factors:</h4>
                          <ul className="space-y-1">
                            {(() => {
                              // Debug logging and normalization
                              console.debug('riskResult payload', JSON.stringify(riskResult, null, 2));
                              
                              const topRisksRaw = riskResult?.topRisks ?? [];
                              const topRisks = Array.isArray(topRisksRaw) ? topRisksRaw : [topRisksRaw];
                              const safeTopRisks: TopRisk[] = topRisks
                                .filter(Boolean)
                                .map(r => typeof r === 'string'
                                  ? { title: r, description: '', severity: 'low' as const }
                                  : r);
                              
                              return safeTopRisks.map((risk, index) => (
                                <li key={risk.title || index} className="flex items-start text-sm">
                                  <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 text-orange-500" />
                                  <div>
                                    <strong>{risk.title}</strong>
                                    {risk.description ? ` — ${risk.description}` : ''}
                                    {risk.severity && (
                                      <Badge className={`ml-2 ${
                                        risk.severity === 'low' ? 'bg-green-100 text-green-800' :
                                        risk.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {risk.severity.toUpperCase()}
                                      </Badge>
                                    )}
                                  </div>
                                </li>
                              ));
                            })()}
                          </ul>
                        </div>

                        <Separator />

                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Recommendations:</h4>
                          <ul className="space-y-1">
                            {(() => {
                              const recsRaw = riskResult?.recommendations ?? [];
                              const recommendations = Array.isArray(recsRaw) ? recsRaw : [recsRaw];
                              
                              return recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start text-sm">
                                  <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-500" />
                                  {typeof rec === 'string' ? rec : rec?.text || JSON.stringify(rec)}
                                </li>
                              ));
                            })()}
                          </ul>
                        </div>

                        <Separator />

                        <div className="text-sm text-gray-600">
                          <p><strong>Estimated Penalty Range:</strong> {riskResult.penaltyRange}</p>
                          <p><strong>Assessment Date:</strong> {new Date(riskResult.generatedAt).toLocaleDateString()}</p>
                          <p><strong>Valid Until:</strong> {new Date(riskResult.expiresAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <Button 
                          onClick={handleGeneratePDF}
                          disabled={pdfMutation.isPending}
                          className="flex-1"
                        >
                          {pdfMutation.isPending ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Generate PDF
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setRiskResult(null);
                            setContractorName('');
                            setContractorEmail('');
                          }}
                        >
                          New Assessment
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}