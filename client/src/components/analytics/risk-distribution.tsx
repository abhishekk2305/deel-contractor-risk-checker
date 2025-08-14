import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartSkeleton } from "@/components/shared/loading-skeleton";
import { AnalyticsData } from "@/types";
import { formatScore } from "@/lib/formatters";

interface RiskDistributionProps {
  data: AnalyticsData | undefined;
  isLoading: boolean;
}

export function RiskDistribution({ data, isLoading }: RiskDistributionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  const distribution = data?.riskDistribution || { low: 0, medium: 0, high: 0 };
  const total = distribution.low + distribution.medium + distribution.high;

  const riskTiers = [
    {
      label: "Low Risk",
      value: distribution.low,
      percentage: total > 0 ? (distribution.low / total) * 100 : 0,
      color: "bg-green-500",
      bgColor: "bg-green-100",
    },
    {
      label: "Medium Risk", 
      value: distribution.medium,
      percentage: total > 0 ? (distribution.medium / total) * 100 : 0,
      color: "bg-amber-500",
      bgColor: "bg-amber-100",
    },
    {
      label: "High Risk",
      value: distribution.high,
      percentage: total > 0 ? (distribution.high / total) * 100 : 0,
      color: "bg-red-500",
      bgColor: "bg-red-100",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Tier Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {riskTiers.map((tier) => (
            <div key={tier.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${tier.color}`}></div>
                  <span className="text-sm font-medium text-gray-700">{tier.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatScore(tier.value)} ({tier.percentage.toFixed(1)}%)
                </span>
              </div>
              <Progress 
                value={tier.percentage} 
                className="h-2"
              />
            </div>
          ))}
        </div>

        {data?.topRiskFactors && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Most Common Risk Factors</h4>
            <div className="space-y-2">
              {data.topRiskFactors.map((factor, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{factor.name}</span>
                  <span className="font-medium text-gray-900">{factor.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
