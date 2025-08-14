import { ChevronLeft, ChevronRight, Eye, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiskBadge } from "@/components/shared/risk-badge";
import { CountryTableSkeleton } from "@/components/shared/loading-skeleton";
import { Country, PaginatedResponse, SearchFilters } from "@/types";
import { analytics } from "@/lib/analytics";

interface CountryTableProps {
  data: PaginatedResponse<Country> | undefined;
  isLoading: boolean;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onCountryClick: (country: Country) => void;
  onRiskCheckClick: (country: Country) => void;
}

export function CountryTable({
  data,
  isLoading,
  filters,
  onFiltersChange,
  onCountryClick,
  onRiskCheckClick,
}: CountryTableProps) {
  const handleSortChange = (sort: string) => {
    onFiltersChange({ ...filters, sort: sort as any, page: 1 });
  };

  const handlePageChange = (page: number) => {
    onFiltersChange({ ...filters, page });
  };

  const handleCountryClick = (country: Country) => {
    analytics.countryView(country.iso, country.name);
    onCountryClick(country);
  };

  const handleRiskCheckClick = (country: Country) => {
    analytics.riskCheckRequest(country.iso, 'unknown', 'unknown');
    onRiskCheckClick(country);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Search Results</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <CountryTableSkeleton />
        </div>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No countries found</h3>
        <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Search Results</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {data.total} countries found
            </span>
            <Select value={filters.sort || 'name'} onValueChange={handleSortChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="risk">Sort by Risk Level</SelectItem>
                <SelectItem value="updated">Sort by Last Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Top Risk Factors</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((country) => (
              <TableRow key={country.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{country.flag || country.iso}</span>
                    <div>
                      <div className="font-medium text-gray-900">{country.name}</div>
                      <div className="text-sm text-gray-500">{country.iso}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {country.riskLevel ? (
                    <RiskBadge 
                      level={country.riskLevel} 
                      score={country.riskScore} 
                      size="sm" 
                    />
                  ) : (
                    <span className="text-sm text-gray-500">Not assessed</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">
                    {country.topRiskFactors?.join(', ') || 'No specific factors'}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {new Date(country.lastUpdated).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCountryClick(country)}
                      className="text-deel-primary hover:text-deel-primary/80"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRiskCheckClick(country)}
                      className="text-deel-secondary hover:text-deel-secondary/80"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Run Check
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <div className="bg-white px-6 py-3 border-t border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Showing {((data.page - 1) * data.pageSize) + 1} to{' '}
          {Math.min(data.page * data.pageSize, data.total)} of {data.total} results
        </div>
        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(data.page - 1)}
            disabled={data.page <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          {/* Page numbers */}
          {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
            const pageNum = Math.max(1, data.page - 2) + i;
            if (pageNum > data.totalPages) return null;
            
            return (
              <Button
                key={pageNum}
                variant={pageNum === data.page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className={pageNum === data.page ? "bg-deel-primary" : ""}
              >
                {pageNum}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(data.page + 1)}
            disabled={data.page >= data.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
