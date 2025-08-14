import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/layout/navigation";
import { RulesTable } from "@/components/admin/rules-table";
import { RuleEditor } from "@/components/admin/rule-editor";
import { VersionHistory } from "@/components/admin/version-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  FileText, 
  Edit, 
  CheckCircle, 
  Globe, 
  Download, 
  Upload, 
  Layout, 
  Users, 
  Clock, 
  Activity,
  MessageSquare,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  Database,
  RefreshCw,
  Eye,
  BarChart3,
  History
} from "lucide-react";
import { ComplianceRule } from "@/types";

export default function AdminRules() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("rules");
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<ComplianceRule | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"rules" | "templates">("rules");
  const [collaborationDialogOpen, setCollaborationDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Rule Templates Queries
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/admin/rule-templates'],
    queryFn: () => apiRequest('/api/admin/rule-templates'),
  });

  const { data: templateCategories = [] } = useQuery({
    queryKey: ['/api/admin/rule-templates/categories'],
    queryFn: () => apiRequest('/api/admin/rule-templates/categories'),
  });

  // Bulk Import Queries
  const { data: importJobs = [] } = useQuery({
    queryKey: ['/api/admin/bulk-imports'],
    queryFn: () => apiRequest('/api/admin/bulk-imports'),
  });

  // Collaboration Queries  
  const { data: collaborationSessions = [] } = useQuery({
    queryKey: ['/api/admin/collaboration/sessions'],
    queryFn: () => apiRequest('/api/admin/collaboration/sessions'),
  });

  // Audit Trail Queries
  const { data: auditTrail = { items: [], total: 0 } } = useQuery({
    queryKey: ['/api/admin/audit-trail'],
    queryFn: () => apiRequest('/api/admin/audit-trail?limit=50'),
  });

  const { data: auditStats = {} } = useQuery({
    queryKey: ['/api/admin/audit-trail/statistics'],
    queryFn: () => apiRequest('/api/admin/audit-trail/statistics'),
  });

  // External Data Sources
  const { data: dataSources = [] } = useQuery({
    queryKey: ['/api/admin/external-data-sources'],
    queryFn: () => apiRequest('/api/admin/external-data-sources'),
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/rule-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rule-templates'] });
      toast({ title: "Template created successfully" });
      setTemplateDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/bulk-imports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bulk-imports'] });
      toast({ title: "Import started successfully" });
      setBulkImportDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to start import", variant: "destructive" });
    },
  });

  const syncDataSourcesMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/external-data-sources/sync', {
      method: 'POST',
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/external-data-sources'] });
      toast({ 
        title: `Sync completed: ${result.successful} successful, ${result.failed} failed` 
      });
    },
    onError: () => {
      toast({ title: "Failed to sync data sources", variant: "destructive" });
    },
  });

  // Event Handlers
  const handleCreateRule = () => {
    setEditingRule(null);
    setShowRuleEditor(true);
  };

  const handleEditRule = (rule: ComplianceRule) => {
    setEditingRule(rule);
    setShowRuleEditor(true);
  };

  const handleCloseEditor = () => {
    setShowRuleEditor(false);
    setEditingRule(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      toast({ title: "Please select a CSV file", variant: "destructive" });
    }
  };

  const handleBulkImport = async () => {
    if (!csvFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target?.result as string;
      
      bulkImportMutation.mutate({
        fileName: csvFile.name,
        fileSize: csvFile.size,
        totalRows: csvContent.split('\n').length - 1, // Subtract header
        importType,
        csvContent,
      });
    };
    reader.readAsText(csvFile);
  };

  const downloadTemplate = async (type: 'rules' | 'templates') => {
    try {
      const response = await fetch(`/api/admin/bulk-imports/template/${type}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-template.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({ title: `Failed to download ${type} template`, variant: "destructive" });
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Navigation activeTab="admin" onTabChange={handleTabChange} />
      
      <div className="space-y-6">
        {/* Enhanced Admin Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Advanced Compliance Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Enterprise-grade rule management with templates, collaboration, and audit trails
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => syncDataSourcesMutation.mutate()}
                  disabled={syncDataSourcesMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncDataSourcesMutation.isPending ? 'animate-spin' : ''}`} />
                  Sync Data
                </Button>
                <Button onClick={handleCreateRule} className="bg-deel-primary hover:bg-deel-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Rules</p>
                  <p className="text-2xl font-bold text-gray-900">{auditStats.totalEntries || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Layout className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Templates</p>
                  <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                  <p className="text-2xl font-bold text-gray-900">{auditStats.pendingApprovals || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {collaborationSessions.filter((s: any) => s.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Tabs Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Bulk Import
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Collaboration
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Sources
            </TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <RulesTable onEditRule={handleEditRule} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Rule Templates</CardTitle>
                <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Rule Template</DialogTitle>
                      <DialogDescription>
                        Define a reusable template for creating compliance rules
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="template-name">Template Name</Label>
                          <Input id="template-name" placeholder="Tax Compliance Template" />
                        </div>
                        <div>
                          <Label htmlFor="template-category">Category</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tax">Tax</SelectItem>
                              <SelectItem value="employment">Employment</SelectItem>
                              <SelectItem value="data_privacy">Data Privacy</SelectItem>
                              <SelectItem value="financial">Financial</SelectItem>
                              <SelectItem value="regulatory">Regulatory</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="template-description">Description</Label>
                        <Textarea 
                          id="template-description" 
                          placeholder="Template for managing tax compliance rules across different jurisdictions..."
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => setTemplateDialogOpen(false)}>
                          Create Template
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template: any) => (
                    <Card key={template.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge variant="secondary">{template.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Severity: {template.defaultSeverity}/10</span>
                          <span>{template.applicableRegions?.length || 0} regions</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Import Tab */}
          <TabsContent value="bulk" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Start New Import</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="import-type">Import Type</Label>
                    <Select value={importType} onValueChange={(value: any) => setImportType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rules">Compliance Rules</SelectItem>
                        <SelectItem value="templates">Rule Templates</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="csv-file">CSV File</Label>
                    <Input 
                      id="csv-file" 
                      type="file" 
                      accept=".csv"
                      onChange={handleFileUpload}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => downloadTemplate(importType)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <Button 
                      onClick={handleBulkImport}
                      disabled={!csvFile || bulkImportMutation.isPending}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Start Import
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Import Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {importJobs.slice(0, 5).map((job: any) => (
                      <div key={job.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{job.fileName}</p>
                          <p className="text-sm text-gray-600">
                            {job.importType} • {job.totalRows} rows
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'failed' ? 'destructive' :
                            job.status === 'processing' ? 'secondary' : 'outline'
                          }>
                            {job.status}
                          </Badge>
                          {job.status === 'processing' && (
                            <Progress 
                              value={(job.processedRows / job.totalRows) * 100} 
                              className="w-20 mt-1"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Collaboration Tab */}
          <TabsContent value="collaboration" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Collaboration Sessions</CardTitle>
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  New Session
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {collaborationSessions.map((session: any) => (
                    <Card key={session.id} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{session.sessionTitle}</h3>
                            <p className="text-sm text-gray-600">
                              {session.entityType} • {session.participants?.length || 0} participants
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                              {session.status}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              Last activity: {new Date(session.lastActivityAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Audit Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auditTrail.items?.slice(0, 10).map((entry: any) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            entry.riskLevel === 'high' ? 'bg-red-500' :
                            entry.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
                          <div>
                            <p className="font-medium">
                              {entry.action} {entry.entity}
                            </p>
                            <p className="text-sm text-gray-600">
                              by {entry.actor} • {new Date(entry.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.requiresApproval && (
                            <Badge variant={
                              entry.approvalStatus === 'approved' ? 'default' :
                              entry.approvalStatus === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {entry.approvalStatus || 'pending'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audit Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Total Entries</span>
                      <span className="font-medium">{auditStats.totalEntries || 0}</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Pending Approvals</span>
                      <span className="font-medium text-orange-600">
                        {auditStats.pendingApprovals || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Approved</span>
                      <span className="font-medium text-green-600">
                        {auditStats.approvedEntries || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Rejected</span>
                      <span className="font-medium text-red-600">
                        {auditStats.rejectedEntries || 0}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Risk Level Distribution</p>
                    {Object.entries(auditStats.byRiskLevel || {}).map(([level, count]: [string, any]) => (
                      <div key={level} className="flex justify-between text-sm">
                        <span className="capitalize">{level}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data Sources Tab */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>External Data Sources</CardTitle>
                <Button 
                  onClick={() => syncDataSourcesMutation.mutate()}
                  disabled={syncDataSourcesMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncDataSourcesMutation.isPending ? 'animate-spin' : ''}`} />
                  Sync All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dataSources.map((source: any) => (
                    <Card key={source.id} className={`border-l-4 ${
                      source.lastSyncStatus === 'success' ? 'border-l-green-500' :
                      source.lastSyncStatus === 'failed' ? 'border-l-red-500' :
                      'border-l-gray-300'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{source.provider}</h3>
                          <Badge variant={source.isActive ? 'default' : 'secondary'}>
                            {source.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {source.dataType} • {source.country || 'Global'}
                        </p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>Last sync: {source.lastSyncAt ? 
                            new Date(source.lastSyncAt).toLocaleString() : 'Never'
                          }</p>
                          <p>Status: <span className={
                            source.lastSyncStatus === 'success' ? 'text-green-600' :
                            source.lastSyncStatus === 'failed' ? 'text-red-600' :
                            'text-gray-600'
                          }>
                            {source.lastSyncStatus || 'Not synced'}
                          </span></p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rule Editor Dialog */}
        {showRuleEditor && (
          <Dialog open={showRuleEditor} onOpenChange={handleCloseEditor}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? 'Edit Compliance Rule' : 'Create New Compliance Rule'}
                </DialogTitle>
              </DialogHeader>
              <RuleEditor 
                rule={editingRule} 
                onClose={handleCloseEditor}
                onSave={handleCloseEditor}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </main>
  );
}