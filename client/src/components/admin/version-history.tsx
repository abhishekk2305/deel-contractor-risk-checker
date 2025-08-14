import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, User, FileText } from "lucide-react";
import { formatDate } from "@/lib/formatters";

interface VersionHistoryProps {
  countryId?: string;
}

interface Version {
  id: string;
  version: number;
  publishedAt: string;
  publishedBy: string;
  notes?: string;
  changes: Array<{
    type: 'added' | 'modified' | 'removed';
    description: string;
  }>;
}

export function VersionHistory({ countryId }: VersionHistoryProps) {
  // Mock data - replace with actual API call
  const [versions] = useState<Version[]>([
    {
      id: '1',
      version: 2,
      publishedAt: '2024-08-14T10:00:00Z',
      publishedBy: 'admin@deel.com',
      notes: 'Updated IR35 regulations and tax compliance rules',
      changes: [
        { type: 'modified', description: 'Updated IR35 off-payroll rules severity from 7 to 8' },
        { type: 'added', description: 'Added new tax residency verification requirement' },
      ]
    },
    {
      id: '2',
      version: 1,
      publishedAt: '2024-01-15T09:00:00Z',
      publishedBy: 'system@deel.com',
      notes: 'Initial ruleset publication',
      changes: [
        { type: 'added', description: 'Created initial compliance framework' },
        { type: 'added', description: 'Established baseline risk assessment rules' },
      ]
    }
  ]);

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-100 text-green-800';
      case 'modified':
        return 'bg-blue-100 text-blue-800';
      case 'removed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Version History</h3>
        <Badge variant="outline">
          {versions.length} versions
        </Badge>
      </div>

      <div className="space-y-3">
        {versions.map((version, index) => (
          <Card key={version.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Version {version.version}
                  {index === 0 && (
                    <Badge className="ml-2 text-xs">Current</Badge>
                  )}
                </CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(version.publishedAt)}
                </div>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <User className="h-3 w-3 mr-1" />
                {version.publishedBy}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {version.notes && (
                <>
                  <div className="flex items-start text-sm mb-3">
                    <FileText className="h-3 w-3 mt-1 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground">{version.notes}</span>
                  </div>
                  <Separator className="mb-3" />
                </>
              )}
              
              <div className="space-y-2">
                {version.changes.map((change, changeIndex) => (
                  <div key={changeIndex} className="flex items-start gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getChangeTypeColor(change.type)}`}
                    >
                      {change.type}
                    </Badge>
                    <span className="text-sm flex-1">{change.description}</span>
                  </div>
                ))}
              </div>
              
              {index === 0 && (
                <div className="mt-3 pt-3 border-t">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}