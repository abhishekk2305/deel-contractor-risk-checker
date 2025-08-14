import { useState } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/layout/navigation";
import { KpiCards } from "@/components/analytics/kpi-cards";
import { ActivityChart } from "@/components/analytics/activity-chart";
import { RiskDistribution } from "@/components/analytics/risk-distribution";
import { TopCountries } from "@/components/analytics/top-countries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";

export default function Analytics() {
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState("30d");

  const { data: analyticsData, isLoading } = useAnalytics();

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

  const handleExportReport = () => {
    // TODO: Implement export functionality
    console.log("Exporting analytics report...");
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Navigation activeTab="analytics" onTabChange={handleTabChange} />
      
      <div className="space-y-6">
        {/* Analytics Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-1">
                  Track usage, performance, and compliance metrics
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">This year</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleExportReport}
                  className="bg-deel-primary hover:bg-deel-primary/90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <KpiCards data={analyticsData} isLoading={isLoading} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityChart data={analyticsData} isLoading={isLoading} />
          <RiskDistribution data={analyticsData} isLoading={isLoading} />
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopCountries data={analyticsData} isLoading={isLoading} />
          
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : analyticsData?.recentActivity ? (
                  analyticsData.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.type === 'search' ? 'bg-blue-100' :
                        activity.type === 'assessment' ? 'bg-amber-100' :
                        activity.type === 'pdf' ? 'bg-green-100' :
                        activity.type === 'rule' ? 'bg-purple-100' :
                        'bg-gray-100'
                      }`}>
                        <div className={`w-3 h-3 ${
                          activity.type === 'search' ? 'text-blue-600' :
                          activity.type === 'assessment' ? 'text-amber-600' :
                          activity.type === 'pdf' ? 'text-green-600' :
                          activity.type === 'rule' ? 'text-purple-600' :
                          'text-gray-600'
                        }`}>
                          •
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
