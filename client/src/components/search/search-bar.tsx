import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchFilters } from "@/types";
import { analytics } from "@/lib/analytics";

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export function SearchBar({ filters, onFiltersChange, onSearch, isLoading }: SearchBarProps) {
  const handleInputChange = (field: keyof SearchFilters, value: string) => {
    onFiltersChange({ ...filters, [field]: value, page: 1 });
    
    if (field !== 'query') {
      analytics.filterChange(field, value);
    }
  };

  const handleSearch = () => {
    analytics.searchSubmit(filters.query || '', {
      contractorType: filters.contractorType,
      paymentMethod: filters.paymentMethod,
      riskLevel: filters.riskLevel,
    });
    onSearch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Global Contractor Risk Assessment
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <Label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search Countries
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="search"
              type="text"
              placeholder="Search by country name..."
              value={filters.query || ''}
              onChange={(e) => handleInputChange('query', e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Contractor Type
          </Label>
          <Select
            value={filters.contractorType || 'all'}
            onValueChange={(value) => handleInputChange('contractorType', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="independent">Independent</SelectItem>
              <SelectItem value="eor">EOR</SelectItem>
              <SelectItem value="freelancer">Freelancer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </Label>
          <Select
            value={filters.paymentMethod || 'all'}
            onValueChange={(value) => handleInputChange('paymentMethod', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="wire">Wire</SelectItem>
              <SelectItem value="ach">ACH</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="paypal">PayPal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-end">
          <Button 
            onClick={handleSearch}
            disabled={isLoading}
            className="w-full bg-deel-primary hover:bg-deel-primary/90"
          >
            <Search className="h-4 w-4 mr-2" />
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>
    </div>
  );
}
