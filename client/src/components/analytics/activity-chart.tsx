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
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Interactive line chart showing searches, risk checks, and PDF generations over time
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Chart component would be implemented with a library like Recharts or Chart.js
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
