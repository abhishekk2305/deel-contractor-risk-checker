import { useState } from "react";
import { ComplianceRule } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye } from "lucide-react";
import { formatDate } from "@/lib/formatters";

interface RulesTableProps {
  rules: ComplianceRule[];
  onEdit: (rule: ComplianceRule) => void;
  onDelete: (ruleId: string) => void;
  onView: (rule: ComplianceRule) => void;
}

export function RulesTable({ rules, onEdit, onDelete, onView }: RulesTableProps) {
  const getSeverityColor = (severity: number) => {
    if (severity >= 8) return "bg-red-100 text-red-800";
    if (severity >= 5) return "bg-orange-100 text-orange-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusColor = (status: string) => {
    return status === 'published' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Effective From</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="font-medium">{rule.ruleType}</TableCell>
              <TableCell className="max-w-xs truncate">{rule.description}</TableCell>
              <TableCell>
                <Badge className={getSeverityColor(rule.severity)}>
                  {rule.severity}/10
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(rule.status)}>
                  {rule.status}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(rule.effectiveFrom)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(rule)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(rule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}