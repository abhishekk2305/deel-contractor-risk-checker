import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TestTube, User } from "lucide-react";

interface TestCase {
  id: string;
  name: string;
  country: string;
  expectedRisk: 'low' | 'medium' | 'high';
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'case-a',
    name: 'John Smith',
    country: 'US',
    expectedRisk: 'low',
    description: 'Expected low risk with minimal sanctions hits'
  },
  {
    id: 'case-b', 
    name: 'Vladimir Putin',
    country: 'RU',
    expectedRisk: 'high',
    description: 'Expected high sanctions hits and PEP status'
  }
];

interface TestDataButtonProps {
  onSelectTestCase: (testCase: { name: string; country: string }) => void;
}

export function TestDataButton({ onSelectTestCase }: TestDataButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <TestTube className="w-4 h-4" />
          Use Test Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {TEST_CASES.map((testCase) => (
          <DropdownMenuItem 
            key={testCase.id}
            onClick={() => onSelectTestCase({ name: testCase.name, country: testCase.country })}
            className="p-3 cursor-pointer"
          >
            <div className="flex items-start gap-3 w-full">
              <User className="w-4 h-4 mt-1 text-gray-400" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{testCase.name}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      testCase.expectedRisk === 'high' 
                        ? 'bg-red-50 text-red-700 border-red-200' 
                        : testCase.expectedRisk === 'medium'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    }`}
                  >
                    {testCase.expectedRisk} risk
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mb-1">{testCase.country}</p>
                <p className="text-xs text-gray-500">{testCase.description}</p>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}