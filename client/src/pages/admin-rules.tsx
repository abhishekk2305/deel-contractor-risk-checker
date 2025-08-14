import { useState } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/layout/navigation";
import { RulesTable } from "@/components/admin/rules-table";
import { RuleEditor } from "@/components/admin/rule-editor";
import { VersionHistory } from "@/components/admin/version-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Edit, CheckCircle, Globe } from "lucide-react";
import { ComplianceRule } from "@/types";

export default function AdminRules() {
  const [, setLocation] = useLocation();
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<ComplianceRule | null>(null);

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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Navigation activeTab="admin" onTabChange={handleTabChange} />
      
      <div className="space-y-6">
        {/* Admin Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Compliance Rules Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage and publish compliance rules for different countries
                </p>
              </div>
              <Button onClick={handleCreateRule} className="bg-deel-primary hover:bg-deel-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Create New Rule
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Rules</p>
                  <p className="text-2xl font-bold text-gray-900">1,247</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Draft Rules</p>
                  <p className="text-2xl font-bold text-amber-600">23</p>
                </div>
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Edit className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Published Today</p>
                  <p className="text-2xl font-bold text-green-600">7</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Countries</p>
                  <p className="text-2xl font-bold text-gray-900">89</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Globe className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rules Table */}
        <RulesTable onEditRule={handleEditRule} />

        {/* Version History */}
        <VersionHistory />
      </div>

      {/* Rule Editor Modal */}
      <RuleEditor
        isOpen={showRuleEditor}
        onClose={handleCloseEditor}
        rule={editingRule}
      />
    </main>
  );
}
