import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { TestTube, User, AlertTriangle, Clock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface TestPreset {
  id: string;
  name: string;
  contractorName: string;
  contractorEmail: string;
  countryIso: string;
  contractorType: 'independent' | 'eor' | 'freelancer';
  expectedRisk: 'low' | 'medium' | 'high';
  expectedSanctions: number;
  expectedPep: boolean;
  description: string;
}

const TEST_PRESETS: TestPreset[] = [
  {
    id: 'john-smith',
    name: 'John Smith (US)',
    contractorName: 'John Smith',
    contractorEmail: 'john.smith@example.com',
    countryIso: 'US',
    contractorType: 'independent',
    expectedRisk: 'low',
    expectedSanctions: 0,
    expectedPep: false,
    description: 'Standard low-risk contractor from United States with clean background'
  },
  {
    id: 'vladimir-putin',
    name: 'Vladimir Putin (RU)',
    contractorName: 'Vladimir Putin',
    contractorEmail: 'vladimir.putin@example.com',
    countryIso: 'RU',
    contractorType: 'independent',
    expectedRisk: 'high',
    expectedSanctions: 100,
    expectedPep: true,
    description: 'High-risk individual with known sanctions and PEP status'
  }
];

interface TestDataButtonProps {
  onTestSelect?: (preset: TestPreset) => void;
}

export function TestDataButton({ onTestSelect }: TestDataButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const testMutation = useMutation({
    mutationFn: async (preset: TestPreset) => {
      const response = await fetch('/api/risk-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorName: preset.contractorName,
          contractorEmail: preset.contractorEmail,
          countryIso: preset.countryIso,
          contractorType: preset.contractorType,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Risk check failed');
      }
      
      return response.json();
    },
    onSuccess: (data, preset) => {
      console.log(`Test data result for ${preset.name}:`, JSON.stringify(data, null, 2));
      toast({
        title: `Test Complete: ${preset.name}`,
        description: `Risk Tier: ${data.result.riskTier.toUpperCase()}, Score: ${data.result.overallScore}`,
      });
      if (onTestSelect) {
        onTestSelect(preset);
      }
    },
    onError: (error, preset) => {
      toast({
        title: `Test Failed: ${preset.name}`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestRun = (preset: TestPreset) => {
    testMutation.mutate(preset);
    setIsOpen(false);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <TestTube className="w-4 h-4" />
          Use Test Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Risk Assessment Test Presets
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Use these predefined test cases to validate risk assessment functionality with known expected outcomes.
          </p>
          
          <div className="grid gap-4">
            {TEST_PRESETS.map((preset) => (
              <Card key={preset.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {preset.name}
                    </CardTitle>
                    <Badge className={getRiskColor(preset.expectedRisk)}>
                      {preset.expectedRisk.toUpperCase()} RISK
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm text-gray-600">{preset.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-medium">Country:</span> {preset.countryIso}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {preset.contractorType}
                    </div>
                    <div>
                      <span className="font-medium">Expected Sanctions:</span> {preset.expectedSanctions}+ hits
                    </div>
                    <div>
                      <span className="font-medium">PEP Status:</span> {preset.expectedPep ? 'Yes' : 'No'}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleTestRun(preset)}
                      disabled={testMutation.isPending}
                    >
                      {testMutation.isPending ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Run Test
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
            <strong>Note:</strong> Test results will be logged to browser console with full JSON response for verification.
            Expected outcomes may vary based on real provider data availability.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}