import { Shield, FileText, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/shared/risk-badge";
import { Country } from "@/types";
import { analytics } from "@/lib/analytics";

interface CountryHeaderProps {
  country: Country;
  onRunRiskCheck: () => void;
  onGeneratePDF: () => void;
}

export function CountryHeader({ country, onRunRiskCheck, onGeneratePDF }: CountryHeaderProps) {
  const handleRiskCheck = () => {
    analytics.riskCheckRequest(country.iso, 'unknown', 'unknown');
    onRunRiskCheck();
  };

  const handlePDFClick = () => {
    analytics.pdfClick(country.iso);
    onGeneratePDF();
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-4xl">{country.flag || country.iso}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{country.name}</h1>
              <p className="text-gray-600">ISO Code: {country.iso}</p>
              <p className="text-sm text-gray-500">
                Last updated: {new Date(country.lastUpdated).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          <div className="text-right">
            {country.riskLevel && (
              <div className="mb-2">
                <RiskBadge level={country.riskLevel} score={country.riskScore} />
              </div>
            )}
            {country.riskScore && (
              <div className="text-sm text-gray-500">Score: {country.riskScore}/100</div>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={handleRiskCheck}
            className="bg-deel-primary hover:bg-deel-primary/90"
          >
            <Shield className="h-4 w-4 mr-2" />
            Run Risk Assessment
          </Button>
          <Button 
            onClick={handlePDFClick}
            className="bg-deel-secondary hover:bg-deel-secondary/90"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button variant="outline">
            <Bell className="h-4 w-4 mr-2" />
            Subscribe to Updates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
