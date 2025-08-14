import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchFilters } from "@/types";

interface FilterChipsProps {
  filters: SearchFilters;
  onFilterRemove: (field: keyof SearchFilters) => void;
}

export function FilterChips({ filters, onFilterRemove }: FilterChipsProps) {
  const activeFilters: Array<{ key: keyof SearchFilters; label: string; value: string }> = [];

  if (filters.contractorType && filters.contractorType !== 'all') {
    activeFilters.push({
      key: 'contractorType',
      label: 'Type',
      value: filters.contractorType,
    });
  }

  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    activeFilters.push({
      key: 'paymentMethod',
      label: 'Payment',
      value: filters.paymentMethod,
    });
  }

  if (filters.riskLevel && filters.riskLevel !== 'all') {
    activeFilters.push({
      key: 'riskLevel',
      label: 'Risk Level',
      value: filters.riskLevel,
    });
  }

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="flex items-center space-x-1 px-3 py-1"
        >
          <span className="text-xs">
            {filter.label}: {filter.value}
          </span>
          <button
            onClick={() => onFilterRemove(filter.key)}
            className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
