import { useState } from "react";
import { Edit, History, Copy, Rocket, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useComplianceRules } from "@/hooks/use-analytics";
import { ComplianceRule } from "@/types";
import { analytics } from "@/lib/analytics";

interface RulesTableProps {
  onEditRule: (rule: ComplianceRule) => void;
}

export function RulesTable({ onEditRule }: RulesTableProps) {
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: rules, isLoading } = useComplianceRules(
    countryFilter === 'all' ? undefined : countryFilter,
    statusFilter === 'all' ? undefined : statusFilter
  );

  const handleEditRule = (rule: ComplianceRule) => {
    analytics.adminRuleUpdate(rule.id, rule.countryId, rule.ruleType);
    onEditRule(rule);
  };

  const handlePublishRule = (rule: ComplianceRule) => {
    analytics.adminRulePublish(rule.countryId, rule.ruleType, rule.version);
    // TODO: Implement publish functionality
    console.log('Publishing rule:', rule.id);
  };

  const handleDeleteRule = (rule: ComplianceRule) => {
    analytics.adminRuleDelete(rule.id, rule.countryId, rule.ruleType);
    // TODO: Implement delete functionality
    console.log('Deleting rule:', rule.id);
  };

  const getSeverityBadge = (severity: number) => {
    if (severity <= 3) {
      return <Badge className="bg-green-100 text-green-800">Low ({severity}/10)</Badge>;
    } else if (severity <= 7) {
      return <Badge className="bg-amber-100 text-amber-800">Medium ({severity}/10)</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">High ({severity}/10)</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'published') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
          Published
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-amber-100 text-amber-800">
          <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
          Draft
        </Badge>
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Compliance Rules</CardTitle>
          <div className="flex space-x-3">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="BR">Brazil</SelectItem>
                <SelectItem value="DE">Germany</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead>Rule Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules?.map((rule) => (
                <TableRow key={rule.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🇺🇸</span>
                      <span className="font-medium">United States</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.ruleType}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {rule.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                  <TableCell>{getStatusBadge(rule.status)}</TableCell>
                  <TableCell className="font-mono text-sm">v{rule.version}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(rule.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {rule.status === 'draft' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePublishRule(rule)}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Rocket className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {rule.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )) || (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No compliance rules found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
