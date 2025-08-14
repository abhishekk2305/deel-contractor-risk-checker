import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Country } from "@/types";

interface RiskBreakdownProps {
  country: Country;
}

// Mock breakdown data - in real app this would come from the API
const mockBreakdown = {
  sanctions: 8,
  adverseMedia: 5,
  internalHistory: 0,
  countryBaseline: 10,
};

const breakdownItems = [
  { key: 'sanctions', label: 'Sanctions/PEP', value: mockBreakdown.sanctions },
  { key: 'adverseMedia', label: 'Adverse Media', value: mockBreakdown.adverseMedia },
  { key: 'internalHistory', label: 'Internal History', value: mockBreakdown.internalHistory },
  { key: 'countryBaseline', label: 'Country Baseline', value: mockBreakdown.countryBaseline },
];

export function RiskBreakdown({ country }: RiskBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {breakdownItems.map((item) => (
            <div key={item.key} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-medium text-gray-900">{item.value}/100</span>
              </div>
              <Progress 
                value={item.value} 
                className="h-2"
                // Custom color based on value
                style={{
                  background: '#f3f4f6',
                }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
