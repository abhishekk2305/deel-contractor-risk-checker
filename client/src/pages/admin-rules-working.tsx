import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/layout/navigation";
import { RulesTable } from "@/components/admin/rules-table";
import { RuleEditor } from "@/components/admin/rule-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, FileText, BarChart3, Database, Settings, Users } from "lucide-react";
import { ComplianceRule } from "@/types";

export default function AdminRules() {
  const [editingRule, setEditingRule] = useState<ComplianceRule | null>(null);
  const [showNewRuleEditor, setShowNewRuleEditor] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch compliance rules
  const { data: rulesResponse, isLoading: rulesLoading } = useQuery({
    queryKey: ['api/compliance-rules'],
    select: (data: any) => data || { rules: [], pagination: { total: 0 } }
  });

  const rules = rulesResponse?.rules || [];
  const totalRules = rulesResponse?.pagination?.total || 0;

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (rule: Partial<ComplianceRule>) =>
      apiRequest('/api/admin/rules', 'POST', rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api/compliance-rules'] });
      toast({
        title: "Success",
        description: "Compliance rule created successfully.",
      });
      setShowNewRuleEditor(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create rule.",
        variant: "destructive",
      });
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: ({ id, ...rule }: Partial<ComplianceRule> & { id: string }) =>
      apiRequest(`/api/admin/rules/${id}`, 'PUT', rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api/compliance-rules'] });
      toast({
        title: "Success",
        description: "Compliance rule updated successfully.",
      });
      setEditingRule(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rule.",
        variant: "destructive",
      });
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/rules/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api/compliance-rules'] });
      toast({
        title: "Success",
        description: "Compliance rule deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rule.",
        variant: "destructive",
      });
    },
  });

  const handleEditRule = (rule: ComplianceRule) => {
    setEditingRule(rule);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      deleteRuleMutation.mutate(ruleId);
    }
  };

  const handleViewRule = (rule: ComplianceRule) => {
    setEditingRule(rule);
  };

  const handleRuleSubmit = (ruleData: Partial<ComplianceRule>) => {
    if (editingRule?.id) {
      updateRuleMutation.mutate({ ...ruleData, id: editingRule.id });
    } else {
      createRuleMutation.mutate(ruleData);
    }
  };

  const handleNewRule = () => {
    setEditingRule({
      id: '',
      countryId: '',
      ruleType: '',
      description: '',
      severity: 5,
      effectiveFrom: new Date().toISOString().split('T')[0],
      status: 'draft',
      version: 1,
      updatedAt: new Date().toISOString(),
      sourceUrl: ''
    } as ComplianceRule);
    setShowNewRuleEditor(true);
  };

  if (rulesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation activeTab="admin" onTabChange={() => {}} />
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab="admin" onTabChange={() => {}} />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Manage compliance rules and system configuration
            </p>
          </div>
          <Button onClick={handleNewRule} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Rule
          </Button>
        </div>

        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rules">Compliance Rules</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalRules}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Published</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {rules.filter((r: ComplianceRule) => r.status === 'published').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Draft</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {rules.filter((r: ComplianceRule) => r.status === 'draft').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Severity</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {rules.filter((r: ComplianceRule) => r.severity >= 8).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Rules Table */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <RulesTable
                  rules={rules}
                  onEdit={handleEditRule}
                  onDelete={handleDeleteRule}
                  onView={handleViewRule}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Analytics Coming Soon
                  </h3>
                  <p className="text-gray-600">
                    Advanced analytics and reporting features will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Settings Panel
                  </h3>
                  <p className="text-gray-600">
                    System configuration and settings will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rule Editor Modal */}
        {(editingRule || showNewRuleEditor) && (
          <RuleEditor
            rule={editingRule}
            onClose={() => {
              setEditingRule(null);
              setShowNewRuleEditor(false);
            }}
            onSubmit={handleRuleSubmit}
          />
        )}
      </div>
    </div>
  );
}