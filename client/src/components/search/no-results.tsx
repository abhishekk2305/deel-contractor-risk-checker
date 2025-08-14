import { SearchX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface NoResultsProps {
  searchQuery?: string;
  onReset: () => void;
  className?: string;
}

export function NoResults({ searchQuery, onReset, className = "" }: NoResultsProps) {
  return (
    <Card className={`text-center py-12 ${className}`}>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <SearchX className="h-8 w-8 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">No results found</h3>
            <p className="text-gray-500 max-w-md">
              {searchQuery 
                ? `No countries found matching "${searchQuery}". Try adjusting your search terms or browse all countries.`
                : "No countries found. Try adjusting your search criteria."
              }
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onReset}
              className="flex items-center"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
            <Button 
              variant="default"
              onClick={() => window.location.href = '/search'}
            >
              Browse All Countries
            </Button>
          </div>
          <div className="text-xs text-gray-400 mt-4">
            Try searching by country name (e.g., "United States") or ISO code (e.g., "US")
          </div>
        </div>
      </CardContent>
    </Card>
  );
}