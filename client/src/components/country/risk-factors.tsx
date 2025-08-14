import { AlertTriangle, Info, CheckCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Country, RiskFactor } from "@/types";

interface RiskFactorsProps {
  country: Country;
}

// Mock risk factors - in real app this would come from the API
const mockRiskFactors: RiskFactor[] = [
  {
    title: "Tax Compliance Requirements",
    description: "Complex state-level tax obligations for independent contractors, requiring careful documentation and compliance monitoring.",
    severity: "medium",
    category: "Tax",
    sourceUrl: "#",
  },
  {
    title: "Worker Classification",
    description: "IRS guidelines for independent contractor vs employee classification require adherence to specific criteria.",
    severity: "low",
    category: "Legal",
    sourceUrl: "#",
  },
  {
    title: "Payment Processing",
    description: "Well-established banking infrastructure with multiple payment method options and regulatory clarity.",
    severity: "low",
    category: "Financial",
    sourceUrl: "#",
  },
];

const severityConfig = {
  low: {
    icon: CheckCircle,
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    iconColor: "text-green-600",
    badgeColor: "bg-green-100 text-green-700",
  },
  medium: {
    icon: AlertTriangle,
    bgColor: "bg-amber-100",
    textColor: "text-amber-800",
    iconColor: "text-amber-600",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  high: {
    icon: AlertTriangle,
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    iconColor: "text-red-600",
    badgeColor: "bg-red-100 text-red-700",
  },
};

export function RiskFactors({ country }: RiskFactorsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Risk Factors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockRiskFactors.map((risk, index) => {
            const config = severityConfig[risk.severity];
            const Icon = config.icon;

            return (
              <div key={index} className={`flex items-start space-x-4 p-4 ${config.bgColor} rounded-lg`}>
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white/50 rounded-full flex items-center justify-center">
                    <Icon className={`${config.iconColor} text-sm h-4 w-4`} />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium ${config.textColor}`}>{risk.title}</h3>
                  <p className={`text-sm mt-1 ${config.textColor}/80`}>{risk.description}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <Badge className={`text-xs font-medium ${config.badgeColor}`}>
                      Severity: {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`text-xs ${config.textColor} hover:${config.bgColor}`}
                      asChild
                    >
                      <a href={risk.sourceUrl} target="_blank" rel="noopener noreferrer">
                        View Guidelines
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
