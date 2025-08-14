import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/shared/loading-skeleton";
import { TrendingUp } from "lucide-react";
import { AnalyticsData } from "@/types";

interface ActivityChartProps {
  data: AnalyticsData | undefined;
  isLoading: boolean;
}

export function ActivityChart({ data, isLoading }: ActivityChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Simple line chart representation with real data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Searches</span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">{(data as any)?.searchCount || 0}</div>
              <div className="text-xs text-blue-600">Last 30 days</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Risk Checks</span>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">{(data as any)?.riskCheckCount || 0}</div>
              <div className="text-xs text-green-600">Last 30 days</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">PDF Reports</span>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">{(data as any)?.pdfGenerationCount || 0}</div>
              <div className="text-xs text-purple-600">Last 30 days</div>
            </div>
          </div>
          
          {/* Recent Activity Preview */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-3">Recent Activity (Last 7 Days)</h4>
            <div className="space-y-2">
              {(data as any)?.recentActivity?.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-600 capitalize">{activity.event.replace('_', ' ')}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
