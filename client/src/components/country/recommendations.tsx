import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Country } from "@/types";

interface RecommendationsProps {
  country: Country;
}

// Mock recommendations - in real app this would come from the API
const mockRecommendations = [
  "Implement automated tax document collection and verification processes for contractor onboarding.",
  "Establish clear worker classification documentation and review processes.",
  "Set up automated compliance monitoring for state-level tax requirement changes.",
  "Consider using established payment processors with built-in compliance features.",
];

export function Recommendations({ country }: RecommendationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockRecommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <Lightbulb className="h-4 w-4 text-deel-secondary" />
              </div>
              <p className="text-sm text-gray-700">{recommendation}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
