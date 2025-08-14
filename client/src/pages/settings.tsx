import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/layout/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Database, Activity, Shield, Server } from "lucide-react";

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: boolean;
  redis: boolean;
  s3: boolean;
  responseTime: number;
}

interface SystemInfo {
  buildSha: string;
  environment: string;
  backendBaseUrl: string;
  providerModes: {
    sanctions: 'complyadvantage' | 'mock';
    media: 'newsapi' | 'mock';
  };
  rateLimits: {
    countries: string;
    riskCheck: string;
    admin: string;
  };
  rulesetThresholds: {
    low: number;
    medium: number;
    high: number;
  };
}

export default function Settings() {
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  // Fetch system health
  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ['api/health'],
    refetchInterval: 30000,
    initialData: {
      status: 'healthy' as const,
      database: true,
      redis: true,
      s3: true,
      responseTime: 150
    }
  });

  // Fetch system info (mock data for demo)
  const systemInfo: SystemInfo = {
    buildSha: 'abc123f',
    environment: 'development',
    backendBaseUrl: 'http://localhost:5000',
    providerModes: {
      sanctions: 'mock',
      media: 'mock'
    },
    rateLimits: {
      countries: '100/min',
      riskCheck: '20/min',
      admin: '50/min'
    },
    rulesetThresholds: {
      low: 30,
      medium: 70,
      high: 100
    }
  };

  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      await refetchHealth();
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab="admin" onTabChange={() => {}} />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600 mt-2">
              System configuration and diagnostics
            </p>
          </div>
          <Button 
            onClick={handleRunDiagnostics} 
            disabled={isRunningDiagnostics}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
            Run Diagnostics
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Overall Status</span>
                <Badge className={getStatusColor(health.status)}>
                  {health.status}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Database
                  </span>
                  <Badge variant={health.database ? "default" : "destructive"}>
                    {health.database ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Redis Cache
                  </span>
                  <Badge variant={health.redis ? "default" : "destructive"}>
                    {health.redis ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Object Storage
                  </span>
                  <Badge variant={health.s3 ? "default" : "destructive"}>
                    {health.s3 ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Response Time</span>
                  <Badge variant="outline">
                    {health.responseTime}ms
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                External Providers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Sanctions Screening</span>
                <Badge className={systemInfo.providerModes.sanctions === 'mock' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                  {systemInfo.providerModes.sanctions}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Adverse Media</span>
                <Badge className={systemInfo.providerModes.media === 'mock' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                  {systemInfo.providerModes.media}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="text-sm text-gray-600">
                <p>Mock mode is used for development and testing.</p>
                <p>Production mode requires API keys.</p>
              </div>
            </CardContent>
          </Card>

          {/* Rate Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Countries API</span>
                <Badge variant="outline">{systemInfo.rateLimits.countries}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Risk Check API</span>
                <Badge variant="outline">{systemInfo.rateLimits.riskCheck}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Admin API</span>
                <Badge variant="outline">{systemInfo.rateLimits.admin}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Risk Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Low Risk</span>
                <Badge className="bg-green-100 text-green-800">
                  &lt; {systemInfo.rulesetThresholds.low}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Medium Risk</span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {systemInfo.rulesetThresholds.low} - {systemInfo.rulesetThresholds.medium}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>High Risk</span>
                <Badge className="bg-red-100 text-red-800">
                  &gt; {systemInfo.rulesetThresholds.medium}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Build SHA</label>
                  <p className="text-gray-600 font-mono">{systemInfo.buildSha}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Environment</label>
                  <p className="text-gray-600">{systemInfo.environment}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Backend URL</label>
                  <p className="text-gray-600">{systemInfo.backendBaseUrl}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}