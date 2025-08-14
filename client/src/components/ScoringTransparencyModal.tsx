import { Info, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatScore } from "@/lib/formatters";

interface ScoringBreakdown {
  sanctions: number;
  pep: number;
  adverseMedia: number;
  internalHistory: number;
  countryBaseline: number;
}

interface ScoringTransparencyModalProps {
  overallScore: number;
  riskTier: 'low' | 'medium' | 'high';
  breakdown: ScoringBreakdown;
  partialSources?: string[];
  rulesetVersion?: number;
  providerInfo?: {
    sanctions?: any;
    adverseMedia?: any;
  };
}

export function ScoringTransparencyModal({
  overallScore,
  riskTier,
  breakdown,
  partialSources = [],
  rulesetVersion = 1,
  providerInfo
}: ScoringTransparencyModalProps) {
  const weights = {
    sanctions: 0.45,      // 45%
    pep: 0.15,           // 15%
    adverseMedia: 0.15,   // 15%
    internalHistory: 0.15, // 15%
    countryBaseline: 0.10  // 10%
  };

  const tierThresholds = {
    low: 30,
    medium: 70,
    high: 100
  };

  const getRiskTierColor = (tier: string) => {
    switch (tier) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSourceStatus = (source: string): 'available' | 'partial' | 'unavailable' => {
    if (partialSources.includes(`${source}-timeout`)) return 'unavailable';
    if (providerInfo?.[source as keyof typeof providerInfo]) return 'available';
    return 'partial';
  };

  const getSourceDisplayName = (source: string): string => {
    const sourceMap: Record<string, string> = {
      'sanctions': 'ComplyAdvantage Sanctions',
      'adverseMedia': 'NewsAPI Adverse Media',
      'pep': 'PEP Screening',
      'internalHistory': 'Internal Risk History',
      'countryBaseline': 'Country Risk Baseline'
    };
    return sourceMap[source] || source;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          aria-label="Learn how risk scoring works"
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          How scoring works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2 text-blue-600" />
            Risk Scoring Methodology
          </DialogTitle>
          <DialogDescription>
            Understanding how your risk assessment score of {formatScore(overallScore)} was calculated
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Score & Tier */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-lg">Overall Risk Score</h3>
              <p className="text-sm text-gray-600">Weighted calculation across all risk factors</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{formatScore(overallScore)}</div>
              <Badge className={getRiskTierColor(riskTier)}>
                {riskTier.toUpperCase()} RISK
              </Badge>
            </div>
          </div>

          {/* Scoring Breakdown */}
          <div>
            <h4 className="font-medium mb-3">Scoring Breakdown</h4>
            <div className="space-y-3">
              {Object.entries(breakdown).map(([factor, score]) => {
                const weight = weights[factor as keyof typeof weights];
                const weightedScore = score * weight;
                return (
                  <div key={factor} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium capitalize">
                        {factor.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </div>
                      <div className="text-sm text-gray-600">
                        Raw score: {formatScore(score)} × {Math.round(weight * 100)}% weight
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatScore(weightedScore)}</div>
                      <div className="text-xs text-gray-500">contribution</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Risk Tier Thresholds */}
          <div>
            <h4 className="font-medium mb-3">Risk Tier Classification</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 border rounded-lg">
                <Badge className="bg-green-100 text-green-800 border-green-200 mb-2">LOW</Badge>
                <div className="text-sm text-gray-600">
                  0 - {formatScore(tierThresholds.low)}
                </div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 mb-2">MEDIUM</Badge>
                <div className="text-sm text-gray-600">
                  {formatScore(tierThresholds.low + 0.01)} - {formatScore(tierThresholds.medium)}
                </div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Badge className="bg-red-100 text-red-800 border-red-200 mb-2">HIGH</Badge>
                <div className="text-sm text-gray-600">
                  {formatScore(tierThresholds.medium + 0.01)} - 100
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Data Sources */}
          <div>
            <h4 className="font-medium mb-3">Contributing Data Sources</h4>
            <div className="space-y-2">
              {Object.keys(breakdown).map(source => {
                const status = getSourceStatus(source);
                return (
                  <div key={source} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{getSourceDisplayName(source)}</span>
                    <Badge 
                      variant={status === 'available' ? 'default' : 'secondary'}
                      className={
                        status === 'available' 
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                      }
                    >
                      {status === 'available' ? 'Available' : 
                       status === 'partial' ? 'Partial' : 'Unavailable'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md space-y-1">
            <div><strong>Ruleset Version:</strong> v{rulesetVersion}</div>
            <div><strong>Assessment Date:</strong> {new Date().toLocaleString()}</div>
            {partialSources.length > 0 && (
              <div><strong>Partial Sources:</strong> {partialSources.length} data source(s) timed out</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}