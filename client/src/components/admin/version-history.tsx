import { GitBranch, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Mock version history data
const mockVersions = [
  {
    id: "1",
    title: "Brazil Ruleset v2.1.0",
    description: "Updated worker classification guidelines and penalty structures",
    author: "Sarah Chen",
    publishedAt: "2024-01-15T10:30:00Z",
    country: "Brazil",
    version: "2.1.0",
  },
  {
    id: "2", 
    title: "UK Ruleset v1.8.3",
    description: "IR35 compliance updates and post-Brexit adjustments",
    author: "James Wilson",
    publishedAt: "2024-01-14T14:15:00Z",
    country: "United Kingdom",
    version: "1.8.3",
  },
  {
    id: "3",
    title: "Germany Ruleset v1.5.2",
    description: "GDPR compliance enhancements for contractor data handling",
    author: "Maria Schmidt",
    publishedAt: "2024-01-12T09:45:00Z",
    country: "Germany", 
    version: "1.5.2",
  },
];

export function VersionHistory() {
  const handleViewChanges = (versionId: string) => {
    // TODO: Implement view changes functionality
    console.log('Viewing changes for version:', versionId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Ruleset Publications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockVersions.map((version, index) => (
            <div key={version.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-deel-primary' : 'bg-deel-secondary'
                }`}>
                  <GitBranch className="text-white text-sm h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{version.title}</h4>
                  <p className="text-sm text-gray-600">{version.description}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-gray-500">
                      Published by <span className="font-medium">{version.author}</span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(version.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewChanges(version.id)}
                className="text-deel-primary hover:text-deel-primary/80"
              >
                <Eye className="h-4 w-4 mr-1" />
                View Changes
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
