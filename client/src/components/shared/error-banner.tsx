import { AlertCircle, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorBannerProps {
  error: Error | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'destructive' | 'default';
  className?: string;
}

export function ErrorBanner({ 
  error, 
  onRetry, 
  onDismiss, 
  variant = 'destructive',
  className 
}: ErrorBannerProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <Alert variant={variant} className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex-1">
        <div className="flex items-center justify-between">
          <span>{errorMessage}</span>
          <div className="flex items-center space-x-2 ml-4">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-8"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function PartialSourceWarning({ 
  partialSources, 
  className 
}: { 
  partialSources: string[];
  className?: string;
}) {
  if (partialSources.length === 0) return null;

  return (
    <Alert variant="default" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <strong>Partial Data Warning:</strong> Some data sources were unavailable during this assessment: {partialSources.join(', ')}. 
        The risk score may be higher than calculated.
      </AlertDescription>
    </Alert>
  );
}
