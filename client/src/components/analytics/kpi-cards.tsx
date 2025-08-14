import { TrendingUp, TrendingDown, Search, Shield, FileText, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnalyticsCardSkeleton } from "@/components/shared/loading-skeleton";
import { AnalyticsData } from "@/types";

interface KpiCardsProps {
  data: AnalyticsData | undefined;
  isLoading: boolean;
}

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  const kpis = [
    {
      title: "Total Searches",
      value: data?.totalSearches || 0,
      change: data?.searchesChange || 0,
      icon: Search,
      color: "blue",
    },
    {
      title: "Risk Assessments", 
      value: data?.riskAssessments || 0,
      change: data?.assessmentsChange || 0,
      icon: Shield,
      color: "amber",
    },
    {
      title: "PDF Reports",
      value: data?.pdfReports || 0,
      change: data?.reportsChange || 0,
      icon: FileText,
      color: "red",
    },
    {
      title: "Avg Response Time",
      value: data?.avgResponseTime ? `${data.avgResponseTime}s` : "0s",
      change: data?.responseTimeChange || 0,
      icon: Clock,
      color: "green",
      isTime: true,
    },
  ];

  const formatValue = (value: number | string) => {
    if (typeof value === 'string') return value;
    return value.toLocaleString();
  };

  const formatChange = (change: number, isTime?: boolean) => {
    const sign = change >= 0 ? '+' : '';
    const suffix = isTime ? 's' : '%';
    return `${sign}${change}${suffix}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <AnalyticsCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const isPositive = kpi.isTime ? kpi.change <= 0 : kpi.change >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;
        
        return (
          <Card key={kpi.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatValue(kpi.value)}
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendIcon className={`text-xs mr-1 h-4 w-4 ${
                      isPositive ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatChange(kpi.change, kpi.isTime)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">vs last period</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  kpi.color === 'blue' ? 'bg-blue-100' :
                  kpi.color === 'amber' ? 'bg-amber-100' :
                  kpi.color === 'red' ? 'bg-red-100' :
                  'bg-green-100'
                }`}>
                  <Icon className={`text-lg h-5 w-5 ${
                    kpi.color === 'blue' ? 'text-blue-600' :
                    kpi.color === 'amber' ? 'text-amber-600' :
                    kpi.color === 'red' ? 'text-red-600' :
                    'text-green-600'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
