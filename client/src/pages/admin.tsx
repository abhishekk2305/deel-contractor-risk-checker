import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Database, 
  FileText, 
  Users, 
  ArrowLeft, 
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Activity
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface ComplianceRule {
  id: string;
  title: string;
  description: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface SystemStatus {
  status: string;
  timestamp: string;
  database: boolean;
  redis: boolean;
  s3: boolean;
  providers: Record<string, string>;
  provider_urls: Record<string, string>;
  build_sha: string;
  version: string;
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');

  // Fetch compliance rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['admin', 'rules'],
    queryFn: async () => {
      const response = await fetch('/api/admin/compliance-rules');
      if (!response.ok) throw new Error('Failed to fetch rules');
      return response.json() as ComplianceRule[];
    },
  });

  // Fetch system status
  const { data: systemStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['admin', 'system-status'],
    queryFn: async () => {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('Failed to fetch system status');
      return response.json() as SystemStatus;
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      const response = await fetch('/api/admin/compliance-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create rule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rules'] });
      setNewRuleTitle('');
      setNewRuleDescription('');
      toast({
        title: "Rule Created",
        description: "New compliance rule has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Publish rule mutation
  const publishRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await fetch(`/api/admin/compliance-rules/${ruleId}/publish`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to publish rule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rules'] });
      toast({
        title: "Rule Published",
        description: "Compliance rule is now active.",
      });
    },
  });

  const handleCreateRule = () => {
    if (newRuleTitle.trim() && newRuleDescription.trim()) {
      createRuleMutation.mutate({
        title: newRuleTitle.trim(),
        description: newRuleDescription.trim(),
      });
    }
  };

  const handleRunDiagnostics = () => {
    refetchStatus();
    toast({
      title: "Diagnostics Running",
      description: "System health check initiated...",
    });
  };

  const getStatusIcon = (status: boolean | string) => {
    if (typeof status === 'boolean') {
      return status ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />;
    }
    return status === 'healthy' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="ghost" onClick={() => setLocation('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              Administration Panel
            </h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Compliance Rules
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Rule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Rule title"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                  />
                  <Input
                    placeholder="Rule description"
                    value={newRuleDescription}
                    onChange={(e) => setNewRuleDescription(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleCreateRule}
                  disabled={createRuleMutation.isPending || !newRuleTitle.trim() || !newRuleDescription.trim()}
                >
                  {createRuleMutation.isPending ? 'Creating...' : 'Create Rule'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Rules</CardTitle>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading rules...</p>
                  </div>
                ) : rules.length === 0 ? (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      No compliance rules found. Create your first rule above.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {rules.map((rule) => (
                      <Card key={rule.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{rule.title}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                rule.status === 'published' ? 'default' : 
                                rule.status === 'draft' ? 'secondary' : 'outline'
                              }>
                                {rule.status}
                              </Badge>
                              <Badge variant="outline">v{rule.version}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Created: {new Date(rule.createdAt).toLocaleDateString()}</span>
                            <div className="flex gap-2">
                              {rule.status === 'draft' && (
                                <Button
                                  size="sm"
                                  onClick={() => publishRuleMutation.mutate(rule.id)}
                                  disabled={publishRuleMutation.isPending}
                                >
                                  Publish
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    Analytics dashboard coming soon. View basic metrics on the home page.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    User management features will be available in future updates.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  System Diagnostics
                  <Button onClick={handleRunDiagnostics} disabled={statusLoading}>
                    {statusLoading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                    Run Diagnostics
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {systemStatus ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium">Overall Status</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(systemStatus.status)}
                        <span className="capitalize">{systemStatus.status}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium">Database</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(systemStatus.database)}
                        <span>{systemStatus.database ? 'Connected' : 'Disconnected'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium">Redis Cache</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(systemStatus.redis)}
                        <span>{systemStatus.redis ? 'Connected' : 'Disconnected'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium">S3 Storage</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(systemStatus.s3)}
                        <span>{systemStatus.s3 ? 'Connected' : 'Disconnected'}</span>
                      </div>
                    </div>
                    
                    <div className="col-span-full space-y-3">
                      <h3 className="font-semibold">External Providers</h3>
                      {Object.entries(systemStatus.providers || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 border rounded">
                          <span className="font-medium capitalize">{key}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{value}</Badge>
                            {systemStatus.provider_urls?.[key] && systemStatus.provider_urls[key] !== 'mock' && (
                              <Badge variant="secondary" className="text-xs">
                                {systemStatus.provider_urls[key].includes('://') 
                                  ? new URL(systemStatus.provider_urls[key]).hostname 
                                  : systemStatus.provider_urls[key]
                                }
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="col-span-full grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded">
                        <span className="text-sm font-medium">Build SHA</span>
                        <p className="text-xs text-gray-600 font-mono">{systemStatus.build_sha}</p>
                      </div>
                      <div className="p-3 border rounded">
                        <span className="text-sm font-medium">Version</span>
                        <p className="text-xs text-gray-600">{systemStatus.version}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Click "Run Diagnostics" to check system status
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}