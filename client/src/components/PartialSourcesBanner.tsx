import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PartialSourcesBannerProps {
  partialSources?: string[];
  className?: string;
}

export function PartialSourcesBanner({ 
  partialSources = [], 
  className = "" 
}: PartialSourcesBannerProps) {
  if (!partialSources || partialSources.length === 0) {
    return null;
  }

  const getSourceDisplayName = (source: string): string => {
    const sourceMap: Record<string, string> = {
      'sanctions-timeout': 'Sanctions screening',
      'adverse-media-timeout': 'Adverse media monitoring',
      'pep-timeout': 'PEP screening',
      'country-data-timeout': 'Country risk data',
      'compliance-timeout': 'Compliance checks'
    };
    return sourceMap[source] || source.replace('-timeout', '').replace('-', ' ');
  };

  return (
    <Alert variant="destructive" className={`border-amber-200 bg-amber-50 text-amber-800 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          Some data sources timed out; results may be partial
        </span>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 p-1"
              aria-label="View details about partial data sources"
            >
              <Info className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Partial Data Sources</DialogTitle>
              <DialogDescription>
                The following data sources did not respond within the expected timeframe. 
                The risk assessment has been generated using available data and fallback scoring mechanisms.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-2">
                  Unavailable Sources:
                </h4>
                <ul className="space-y-1">
                  {partialSources.map((source, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <AlertTriangle className="h-3 w-3 text-amber-500 mr-2 flex-shrink-0" />
                      {getSourceDisplayName(source)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                <strong>Impact:</strong> Fallback scoring algorithms were used to estimate risk factors 
                for unavailable data sources. Consider re-running the assessment later for complete results.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </AlertDescription>
    </Alert>
  );
}