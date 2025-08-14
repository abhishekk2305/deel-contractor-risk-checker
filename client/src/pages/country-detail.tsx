import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Navigation } from "@/components/layout/navigation";
import { CountryHeader } from "@/components/country/country-header";
import { RiskFactors } from "@/components/country/risk-factors";
import { Recommendations } from "@/components/country/recommendations";
import { RiskBreakdown } from "@/components/country/risk-breakdown";
import { RiskCheckModal } from "@/components/modals/risk-check-modal";
import { PdfModal } from "@/components/modals/pdf-modal";
import { ErrorBanner } from "@/components/shared/error-banner";
import { DataSourcesInfo } from "@/components/shared/data-sources-info";
import { useCountry } from "@/hooks/use-countries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CountryDetail() {
  const { iso } = useParams<{ iso: string }>();
  const [, setLocation] = useLocation();
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const { data: country, isLoading, error, refetch } = useCountry(iso);

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

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Navigation activeTab="countries" onTabChange={handleTabChange} />
        <ErrorBanner 
          error={error} 
          onRetry={() => refetch()}
          className="mt-8"
        />
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Navigation activeTab="countries" onTabChange={handleTabChange} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-40" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  if (!country) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Navigation activeTab="countries" onTabChange={handleTabChange} />
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Country Not Found</h2>
          <p className="text-gray-600">The country with ISO code "{iso}" was not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Navigation activeTab="countries" onTabChange={handleTabChange} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <CountryHeader
            country={country}
            onRunRiskCheck={() => setShowRiskModal(true)}
            onGeneratePDF={() => setShowPdfModal(true)}
          />
          
          <RiskFactors country={country} />
          
          <Recommendations country={country} />
        </div>

        <div className="space-y-6">
          <RiskBreakdown country={country} />
          
          <Card>
            <CardHeader>
              <CardTitle>Potential Penalties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <span className="font-medium text-green-800">Low Risk Range</span>
                </div>
                <p className="text-sm text-green-700">
                  $500 - $2,500 in potential fines for minor compliance issues
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Data Sources</CardTitle>
                <DataSourcesInfo />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">OpenSanctions (live)</span>
                  </div>
                  <span className="text-xs text-gray-500">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">NewsAPI (live)</span>
                  </div>
                  <span className="text-xs text-gray-500">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Internal Database</span>
                  </div>
                  <span className="text-xs text-gray-500">Active</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Last updated: {new Date(country.lastUpdated).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Ruleset version: v1.2.3</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RiskCheckModal
        isOpen={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        country={country}
        onSuccess={() => {
          setShowRiskModal(false);
          setShowPdfModal(true);
        }}
      />

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        country={country}
      />
    </main>
  );
}
