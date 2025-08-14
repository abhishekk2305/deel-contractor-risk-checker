import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Shield, 
  Newspaper, 
  History, 
  Globe,
  Info,
  CheckCircle,
  XCircle
} from "lucide-react";

interface ScoringTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScoringTransparencyModal({ isOpen, onClose }: ScoringTransparencyModalProps) {
  const scoringWeights = [
    {
      category: "Sanctions Screening",
      weight: 45,
      icon: Shield,
      description: "Checks against global sanctions lists including OFAC, EU, UN, and UK sanctions",
      sources: "OpenSanctions (live)",
      thresholds: "0 hits = 0-15 pts, 1-5 hits = 16-35 pts, 6+ hits = 36-45 pts"
    },
    {
      category: "PEP (Politically Exposed Person)",
      weight: 15,
      icon: AlertTriangle,
      description: "Identifies politically exposed persons and their close associates",
      sources: "OpenSanctions (live)",
      thresholds: "Not PEP = 0 pts, PEP = 15 pts"
    },
    {
      category: "Adverse Media",
      weight: 15,
      icon: Newspaper,
      description: "Scans recent news for negative mentions, criminal activity, or compliance issues",
      sources: "NewsAPI (live)",
      thresholds: "No mentions = 0 pts, Some = 5-10 pts, Extensive = 11-15 pts"
    },
    {
      category: "Internal History",
      weight: 15,
      icon: History,
      description: "Previous risk assessments, compliance violations, and performance history",
      sources: "Internal database",
      thresholds: "Clean = 0-5 pts, Issues = 6-10 pts, Major violations = 11-15 pts"
    },
    {
      category: "Country Baseline",
      weight: 10,
      icon: Globe,
      description: "Country-specific risk factors including corruption index, regulatory environment",
      sources: "World Bank, Transparency International",
      thresholds: "Low risk countries = 0-3 pts, Medium = 4-7 pts, High = 8-10 pts"
    }
  ];

  const riskTiers = [
    { tier: "Low Risk", range: "0-30", color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" },
    { tier: "Medium Risk", range: "31-70", color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" },
    { tier: "High Risk", range: "71-100", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            How Scoring Works - Risk Assessment Methodology
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Overview */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Assessment Overview</h3>
            <p className="text-blue-800 text-sm">
              Our risk scoring engine uses a weighted algorithm that evaluates contractors across five key dimensions. 
              The system integrates with live data providers to ensure real-time accuracy and comprehensive coverage.
            </p>
          </div>

          {/* Scoring Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Scoring Categories & Weights</h3>
            {scoringWeights.map((category) => (
              <Card key={category.category} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <category.icon className="w-4 h-4" />
                      {category.category}
                    </CardTitle>
                    <Badge variant="outline" className="font-mono">
                      {category.weight}% weight
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Progress value={category.weight * 2} className="flex-1" />
                    <span className="text-sm text-gray-500">{category.weight}/100</span>
                  </div>
                  
                  <p className="text-sm text-gray-600">{category.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-medium text-gray-700">Data Source:</span>
                      <div className="flex items-center gap-1 mt-1">
                        {category.sources.includes('live') ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-gray-400" />
                        )}
                        <span className="text-gray-600">{category.sources}</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Scoring Thresholds:</span>
                      <p className="text-gray-600 mt-1">{category.thresholds}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Risk Tiers */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Risk Tier Classification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {riskTiers.map((tier) => (
                <div key={tier.tier} className={`p-4 rounded-lg border ${tier.bgColor} ${tier.borderColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-semibold ${tier.color}`}>{tier.tier}</h4>
                    <Badge variant="outline" className="font-mono">
                      {tier.range} pts
                    </Badge>
                  </div>
                  <Progress 
                    value={tier.range === "0-30" ? 30 : tier.range === "31-70" ? 70 : 100} 
                    className="mb-2" 
                  />
                  <p className="text-xs text-gray-600">
                    {tier.tier === "Low Risk" && "Minimal compliance concerns, standard due diligence"}
                    {tier.tier === "Medium Risk" && "Enhanced monitoring required, additional documentation"}
                    {tier.tier === "High Risk" && "Extensive review needed, senior approval required"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Data Sources */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Active Data Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">OpenSanctions</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">Live</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Comprehensive sanctions and PEP database with 1200+ verified entries from global regulatory bodies.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">NewsAPI</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">Live</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Real-time adverse media monitoring across 80,000+ news sources worldwide.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Formula */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Calculation Formula</h3>
            <code className="text-sm font-mono bg-white p-2 rounded border block">
              Overall Score = (Sanctions × 0.45) + (PEP × 0.15) + (AdverseMedia × 0.15) + (InternalHistory × 0.15) + (CountryBaseline × 0.10)
            </code>
            <p className="text-xs text-gray-600 mt-2">
              All component scores are normalized to 0-100 scale before applying weights. Final score determines risk tier classification.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}